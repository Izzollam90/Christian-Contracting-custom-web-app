-- Herkey Maintenance: initial schema for the web apps (Supabase / Postgres).
-- Mirrors the Glide workbook (glide/Herkey-Maintenance-Glide-Data.xlsx) so the two can stay in step.
-- STATUS: hand-written, not yet run. Apply it to a scratch project, then run tests/rls_checks.sql before trusting it.
-- Conventions: money in integer cents; timestamps are timestamptz (stored UTC); text IDs keep the human-readable
-- J-/EST-/INV- numbers that customers see.

-- ============ enums ============
create type app_role        as enum ('Customer','Crew','CrewLead','Finance','Admin');
create type job_status      as enum ('Requested','Accepted','Scheduled','In Progress','Completed','On Hold','Canceled');
create type job_priority    as enum ('Routine','Soon','Emergency');
create type estimate_status as enum ('Draft','Sent','Accepted','Rejected');
create type invoice_status  as enum ('Draft','Unpaid','Paid','Void');
create type expense_status  as enum ('Submitted','Approved','Rejected');
create type time_review     as enum ('Open','Approved','Needs Review','Rejected');

-- ============ lookup / config ============
create table settings (key text primary key, value text not null, notes text);
create table service_categories (category text primary key, description text, active boolean not null default true);
create table time_slots (slot text primary key, start_time time not null, end_time time not null, sort_order int not null);

-- ============ people ============
create sequence customers_seq start 100;
create table customers (
  id          text primary key default ('C-' || to_char(nextval('customers_seq'::regclass), 'FM0000')),
  name        text not null,
  email       text unique,
  phone       text,
  street      text, city text, state text, zip text,
  latitude    double precision, longitude double precision,
  created_at  timestamptz not null default now()
);

create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  full_name         text,
  phone             text,
  role              app_role not null default 'Customer',
  customer_id       text references customers(id),
  hourly_rate_cents int,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

-- ============ work ============
create sequence jobs_seq start 1100;
create table jobs (
  id              text primary key default ('J-' || nextval('jobs_seq')),
  title           text not null check (length(title) between 1 and 120),
  description     text,
  category        text not null references service_categories(category),
  priority        job_priority not null default 'Routine',
  status          job_status not null default 'Requested',
  customer_id     text not null references customers(id),
  service_address text not null,
  street_name     text,             -- shown on the job board before claim (no house number)
  crew_id         uuid references profiles(id),
  preferred_date  date,
  time_slot       text references time_slots(slot),
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  completed_at    timestamptz
);
-- Street name without the house number, for the pre-claim job board.
create or replace function set_street_name() returns trigger language plpgsql as $$
begin new.street_name := regexp_replace(split_part(new.service_address, ',', 1), '^\s*\d+[A-Za-z]?\s+', ''); return new; end $$;
create trigger jobs_street_name before insert or update of service_address on jobs for each row execute function set_street_name();
create index on jobs (status);
create index on jobs (customer_id);
create index on jobs (crew_id);

create table activity_log (
  id                  bigint generated always as identity primary key,
  job_id              text not null references jobs(id) on delete cascade,
  at                  timestamptz not null default now(),
  actor_id            uuid references profiles(id),
  action              text not null,
  visible_to_customer boolean not null default true
);
create index on activity_log (job_id, at desc);

create sequence estimates_seq start 2100;
create table estimates (
  id           text primary key default ('EST-' || nextval('estimates_seq')),
  job_id       text not null references jobs(id) on delete cascade,
  status       estimate_status not null default 'Draft',
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  sent_at      timestamptz,
  responded_at timestamptz,
  customer_comment text
);
create table estimate_lines (
  id               bigint generated always as identity primary key,
  estimate_id      text not null references estimates(id) on delete cascade,
  description      text not null,
  quantity         numeric(10,2) not null check (quantity > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  line_total_cents int generated always as (round(quantity * unit_price_cents)::int) stored
);

create sequence invoices_seq start 3100;
create table invoices (
  id             text primary key default ('INV-' || nextval('invoices_seq')),
  job_id         text not null references jobs(id),
  estimate_id    text references estimates(id),
  status         invoice_status not null default 'Draft',
  issued_at      timestamptz,
  due_date       date,
  paid_at        timestamptz,
  payment_method text
);
create table invoice_lines (
  id               bigint generated always as identity primary key,
  invoice_id       text not null references invoices(id) on delete cascade,
  description      text not null,
  quantity         numeric(10,2) not null check (quantity > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  line_total_cents int generated always as (round(quantity * unit_price_cents)::int) stored
);

create table expenses (
  id           bigint generated always as identity primary key,
  submitted_by uuid not null references profiles(id) default auth.uid(),
  job_id       text references jobs(id),
  category     text not null,
  vendor       text,
  amount_cents int not null check (amount_cents > 0),
  expense_date date not null default current_date,
  status       expense_status not null default 'Submitted',
  reviewed_by  uuid references profiles(id),
  note         text,
  receipt_path text
);

create table time_entries (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references profiles(id) default auth.uid(),
  job_id          text references jobs(id),
  customer_id     text references customers(id),
  clock_in        timestamptz not null default now(),
  clock_out       timestamptz,
  distance_meters int,
  location_check  text,                       -- 'Within geofence' | 'Outside geofence' | 'Not checked'
  review          time_review not null default 'Open',
  note            text,
  check (clock_out is null or clock_out > clock_in)
);
-- one open shift per person
create unique index one_open_shift on time_entries (user_id) where clock_out is null;

-- ============ helper functions (security definer, read the caller's profile) ============
create or replace function my_role() returns app_role language sql stable security definer set search_path = public as
  $$ select role from profiles where id = auth.uid() and active $$;
create or replace function my_customer_id() returns text language sql stable security definer set search_path = public as
  $$ select customer_id from profiles where id = auth.uid() $$;
create or replace function is_staff() returns boolean language sql stable as
  $$ select coalesce(my_role() in ('Crew','CrewLead','Finance','Admin'), false) $$;
create or replace function has_role(variadic r app_role[]) returns boolean language sql stable as
  $$ select coalesce(my_role() = any(r), false) $$;

-- New sign-ups (Google / Apple / email) get a Customer profile and a linked customer record.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare cid text;
begin
  select id into cid from customers where lower(email) = lower(new.email);   -- link to an existing customer by email
  if cid is null then
    insert into customers (name, email) values (coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email) returning id into cid;
  end if;
  insert into profiles (id, email, full_name, role, customer_id)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'Customer', cid);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
-- Staff accounts: Admin changes role from 'Customer' to a staff role after the person's first sign-in.

-- Nobody but Admin may change role, rate or active flag. When auth.uid() is null there is no
-- authenticated caller (SQL editor / service role), which is an admin context: allowed.
create or replace function guard_profile_update() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null
     and (new.role, new.hourly_rate_cents, new.active, new.customer_id) is distinct from (old.role, old.hourly_rate_cents, old.active, old.customer_id)
     and not has_role('Admin') then
    raise exception 'Only an Admin can change role, rate, active status or customer link';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on profiles for each row execute function guard_profile_update();

-- ============ row level security ============
alter table settings enable row level security;
alter table service_categories enable row level security;
alter table time_slots enable row level security;
alter table customers enable row level security;
alter table profiles enable row level security;
alter table jobs enable row level security;
alter table activity_log enable row level security;
alter table estimates enable row level security;
alter table estimate_lines enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;
alter table expenses enable row level security;
alter table time_entries enable row level security;

-- lookups: any signed-in user reads; Admin writes
create policy read_lookups on settings for select to authenticated using (true);
create policy read_lookups on service_categories for select to authenticated using (true);
create policy read_lookups on time_slots for select to authenticated using (true);
create policy admin_write on settings for all to authenticated using (has_role('Admin')) with check (has_role('Admin'));
create policy admin_write on service_categories for all to authenticated using (has_role('Admin')) with check (has_role('Admin'));
create policy admin_write on time_slots for all to authenticated using (has_role('Admin')) with check (has_role('Admin'));

-- profiles
create policy own_profile_read on profiles for select to authenticated using (id = auth.uid() or is_staff());
create policy own_profile_update on profiles for update to authenticated using (id = auth.uid() or has_role('Admin'));

-- customers: own record, or staff
create policy customer_read on customers for select to authenticated using (id = my_customer_id() or has_role('CrewLead','Finance','Admin')
  or exists (select 1 from jobs j where j.customer_id = customers.id and j.crew_id = auth.uid()));   -- crew see customers of jobs they hold
create policy customer_update_own on customers for update to authenticated using (id = my_customer_id() or has_role('Admin'));
create policy staff_insert_customer on customers for insert to authenticated with check (has_role('CrewLead','Admin'));

-- jobs
create policy jobs_customer_read on jobs for select to authenticated using (customer_id = my_customer_id());
create policy jobs_crew_read on jobs for select to authenticated using (crew_id = auth.uid());           -- unclaimed jobs come via job_board view
create policy jobs_office_read on jobs for select to authenticated using (has_role('CrewLead','Finance','Admin'));
create policy jobs_customer_insert on jobs for insert to authenticated
  with check (customer_id = my_customer_id() and status = 'Requested' and crew_id is null);
create policy jobs_office_write on jobs for all to authenticated using (has_role('CrewLead','Admin')) with check (has_role('CrewLead','Admin'));
-- Crew status changes and customer cancel go through the RPCs below, not direct UPDATE.

-- Job board: limited columns for open, unclaimed jobs. The view runs with its owner's rights (Postgres default),
-- so crew can see rows they don't own yet; the is_staff() filter keeps customers out. No name, phone or house number.
create view job_board with (security_barrier) as
  select id, title, category, priority, preferred_date, time_slot, street_name, created_at
  from jobs where status = 'Requested' and crew_id is null and is_staff();
grant select on job_board to authenticated;

-- activity log
create policy log_customer_read on activity_log for select to authenticated
  using (visible_to_customer and exists (select 1 from jobs j where j.id = job_id and j.customer_id = my_customer_id()));
create policy log_staff_read on activity_log for select to authenticated
  using (has_role('CrewLead','Finance','Admin') or exists (select 1 from jobs j where j.id = job_id and j.crew_id = auth.uid()));
create policy log_insert on activity_log for insert to authenticated with check (actor_id = auth.uid() and (
  exists (select 1 from jobs j where j.id = job_id and (j.customer_id = my_customer_id() or j.crew_id = auth.uid()))
  or has_role('CrewLead','Finance','Admin')));

-- estimates (+ lines follow their estimate)
create policy est_customer_read on estimates for select to authenticated
  using (status <> 'Draft' and exists (select 1 from jobs j where j.id = job_id and j.customer_id = my_customer_id()));
create policy est_staff_read on estimates for select to authenticated
  using (has_role('CrewLead','Finance','Admin') or exists (select 1 from jobs j where j.id = job_id and j.crew_id = auth.uid()));
create policy est_staff_write on estimates for all to authenticated
  using (has_role('CrewLead','Admin') or (status = 'Draft' and exists (select 1 from jobs j where j.id = job_id and j.crew_id = auth.uid())))
  with check (has_role('CrewLead','Admin') or (status in ('Draft','Sent') and exists (select 1 from jobs j where j.id = job_id and j.crew_id = auth.uid())));
create policy estl_read on estimate_lines for select to authenticated using (exists (select 1 from estimates e where e.id = estimate_id));  -- inherits estimates RLS
create policy estl_write on estimate_lines for all to authenticated
  using (exists (select 1 from estimates e where e.id = estimate_id and e.status = 'Draft'))
  with check (exists (select 1 from estimates e where e.id = estimate_id and e.status = 'Draft'));

-- invoices (+ lines)
create policy inv_customer_read on invoices for select to authenticated
  using (status <> 'Draft' and exists (select 1 from jobs j where j.id = job_id and j.customer_id = my_customer_id()));
create policy inv_office on invoices for all to authenticated using (has_role('Finance','Admin')) with check (has_role('Finance','Admin'));
create policy invl_read on invoice_lines for select to authenticated using (exists (select 1 from invoices i where i.id = invoice_id));
create policy invl_office on invoice_lines for all to authenticated using (has_role('Finance','Admin')) with check (has_role('Finance','Admin'));

-- expenses: own, or approvers
create policy exp_own on expenses for select to authenticated using (submitted_by = auth.uid() or has_role('CrewLead','Finance','Admin'));
create policy exp_submit on expenses for insert to authenticated with check (submitted_by = auth.uid() and status = 'Submitted' and is_staff());
create policy exp_review on expenses for update to authenticated using (has_role('CrewLead','Finance','Admin')) with check (has_role('CrewLead','Finance','Admin'));

-- time entries: own, or approvers
create policy te_read on time_entries for select to authenticated using (user_id = auth.uid() or has_role('CrewLead','Finance','Admin'));
create policy te_clock_in on time_entries for insert to authenticated with check (user_id = auth.uid() and is_staff() and review in ('Open','Needs Review'));
create policy te_clock_out on time_entries for update to authenticated using (user_id = auth.uid() and clock_out is null) with check (user_id = auth.uid());
create policy te_review on time_entries for update to authenticated using (has_role('CrewLead','Finance','Admin')) with check (has_role('CrewLead','Finance','Admin'));

-- ============ RPCs for state changes that need rules ============
-- Atomic claim: only succeeds if nobody else claimed first.
create or replace function claim_job(p_job text) returns jobs language plpgsql security definer set search_path = public as $$
declare r jobs;
begin
  if not has_role('Crew','CrewLead','Admin') then raise exception 'Not allowed to claim jobs'; end if;
  update jobs set crew_id = auth.uid(), status = 'Accepted', accepted_at = now()
   where id = p_job and crew_id is null and status = 'Requested' returning * into r;
  if r.id is null then raise exception 'Job already claimed or not open'; end if;
  insert into activity_log (job_id, actor_id, action) values (p_job, auth.uid(), 'Claimed by ' || coalesce((select full_name from profiles where id = auth.uid()), 'crew'));
  return r;
end $$;

-- Crew on their own job: In Progress / On Hold / Completed.
create or replace function set_job_status(p_job text, p_status job_status, p_note text default null) returns jobs
language plpgsql security definer set search_path = public as $$
declare r jobs;
begin
  if not (has_role('CrewLead','Admin') or exists (select 1 from jobs where id = p_job and crew_id = auth.uid())) then raise exception 'Not your job'; end if;
  if p_status not in ('Scheduled','In Progress','On Hold','Completed') and not has_role('CrewLead','Admin') then raise exception 'Status not allowed'; end if;
  update jobs set status = p_status, completed_at = case when p_status = 'Completed' then now() else completed_at end where id = p_job returning * into r;
  insert into activity_log (job_id, actor_id, action) values (p_job, auth.uid(), 'Status: ' || p_status || coalesce(' · ' || p_note, ''));
  return r;
end $$;

-- Customer cancels own job (before work starts).
create or replace function cancel_my_job(p_job text) returns jobs language plpgsql security definer set search_path = public as $$
declare r jobs;
begin
  update jobs set status = 'Canceled' where id = p_job and customer_id = my_customer_id() and status in ('Requested','Accepted','Scheduled') returning * into r;
  if r.id is null then raise exception 'This job can no longer be canceled online'; end if;
  insert into activity_log (job_id, actor_id, action) values (p_job, auth.uid(), 'Customer canceled the request');
  return r;
end $$;

-- Customer accepts / rejects an estimate that was sent to them.
create or replace function respond_estimate(p_estimate text, p_accept boolean, p_comment text default null) returns estimates
language plpgsql security definer set search_path = public as $$
declare r estimates;
begin
  update estimates e set status = case when p_accept then 'Accepted'::estimate_status else 'Rejected' end, responded_at = now(), customer_comment = p_comment
   where e.id = p_estimate and e.status = 'Sent'
     and exists (select 1 from jobs j where j.id = e.job_id and j.customer_id = my_customer_id())
   returning * into r;
  if r.id is null then raise exception 'Estimate not found or already answered'; end if;
  insert into activity_log (job_id, actor_id, action) values (r.job_id, auth.uid(), 'Customer ' || case when p_accept then 'accepted' else 'declined' end || ' estimate ' || r.id);
  return r;
end $$;

-- Office: copy an accepted estimate into a draft invoice.
create or replace function invoice_from_estimate(p_estimate text) returns invoices language plpgsql security definer set search_path = public as $$
declare e estimates; i invoices;
begin
  if not has_role('Finance','Admin') then raise exception 'Not allowed'; end if;
  select * into e from estimates where id = p_estimate and status = 'Accepted';
  if e.id is null then raise exception 'Estimate must be Accepted'; end if;
  insert into invoices (job_id, estimate_id) values (e.job_id, e.id) returning * into i;
  insert into invoice_lines (invoice_id, description, quantity, unit_price_cents)
    select i.id, description, quantity, unit_price_cents from estimate_lines where estimate_id = e.id;
  insert into activity_log (job_id, actor_id, action, visible_to_customer) values (e.job_id, auth.uid(), 'Invoice ' || i.id || ' drafted from ' || e.id, false);
  return i;
end $$;

revoke all on function claim_job, set_job_status, cancel_my_job, respond_estimate, invoice_from_estimate from public;
grant execute on function claim_job, set_job_status, cancel_my_job, respond_estimate, invoice_from_estimate to authenticated;

-- ============ realtime (both apps update live) ============
alter publication supabase_realtime add table jobs, activity_log, estimates, invoices, expenses, time_entries;
