-- 0002: two-factor authentication enforcement (requirements §11, owner Nov 6).
-- Supabase Auth MFA raises the JWT's "aal" claim to 'aal2' once the user verifies a second
-- factor. Money and access actions must require aal2 — enforced HERE in the database,
-- not just in the UI.
-- Sign-in methods per latest owner instruction: Google + email/password only.
-- 2FA factors allowed: TOTP (authenticator app) and SMS (phone). No passkeys, no email OTP.

create or replace function is_aal2() returns boolean language sql stable security definer
  set search_path = public as
  $$ select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' $$;

create or replace function require_aal2(p_action text) returns void language plpgsql stable as $$
begin
  if not is_aal2() then
    raise exception 'Two-factor authentication required for % (aal2)', p_action
      using errcode = '42501';
  end if;
end $$;

-- Customer accepting/declining an estimate is a money action.
create or replace function respond_estimate(p_estimate text, p_accept boolean, p_comment text default null) returns estimates
language plpgsql security definer set search_path = public as $$
declare r estimates;
begin
  perform require_aal2('responding to an estimate');
  update estimates e set status = case when p_accept then 'Accepted'::estimate_status else 'Rejected' end, responded_at = now(), customer_comment = p_comment
   where e.id = p_estimate and e.status = 'Sent'
     and exists (select 1 from jobs j where j.id = e.job_id and j.customer_id = my_customer_id())
   returning * into r;
  if r.id is null then raise exception 'Estimate not found or already answered'; end if;
  insert into activity_log (job_id, actor_id, action) values (r.job_id, auth.uid(), 'Customer ' || case when p_accept then 'accepted' else 'declined' end || ' estimate ' || r.id);
  return r;
end $$;

-- Finance creating an invoice from an estimate.
create or replace function invoice_from_estimate(p_estimate text) returns invoices language plpgsql security definer set search_path = public as $$
declare e estimates; i invoices;
begin
  perform require_aal2('creating an invoice');
  if not has_role('Finance','Admin') then raise exception 'Not allowed'; end if;
  select * into e from estimates where id = p_estimate and status = 'Accepted';
  if e.id is null then raise exception 'Estimate must be Accepted'; end if;
  insert into invoices (job_id, estimate_id) values (e.job_id, e.id) returning * into i;
  insert into invoice_lines (invoice_id, description, quantity, unit_price_cents)
    select i.id, description, quantity, unit_price_cents from estimate_lines where estimate_id = e.id;
  insert into activity_log (job_id, actor_id, action, visible_to_customer) values (e.job_id, auth.uid(), 'Invoice ' || i.id || ' drafted from ' || e.id, false);
  return i;
end $$;

-- Expense review (approve/reject) and time review (approve/reject/flag) are approval actions:
-- they go through direct UPDATEs guarded by RLS policies, so wrap them in RPCs that require aal2.
create or replace function review_expense(p_expense bigint, p_status expense_status) returns expenses
language plpgsql security definer set search_path = public as $$
declare r expenses;
begin
  if p_status not in ('Approved','Rejected') then raise exception 'Status must be Approved or Rejected'; end if;
  perform require_aal2('reviewing an expense');
  if not has_role('CrewLead','Finance','Admin') then raise exception 'Not allowed to review expenses'; end if;
  update expenses set status = p_status, reviewed_by = auth.uid() where id = p_expense and status = 'Submitted'
    returning * into r;
  if r.id is null then raise exception 'Expense not found or not awaiting review'; end if;
  if r.job_id is not null then
    insert into activity_log (job_id, actor_id, action, visible_to_customer) values (r.job_id, auth.uid(), 'Expense #' || r.id || ' ' || p_status, false);
  end if;
  return r;
end $$;

create or replace function review_time_entry(p_entry bigint, p_review time_review) returns time_entries
language plpgsql security definer set search_path = public as $$
declare r time_entries;
begin
  if p_review not in ('Approved','Rejected') then raise exception 'Review must be Approved or Rejected'; end if;
  perform require_aal2('reviewing a time entry');
  if not has_role('CrewLead','Finance','Admin') then raise exception 'Not allowed to review time'; end if;
  update time_entries set review = p_review where id = p_entry returning * into r;
  if r.id is null then raise exception 'Time entry not found'; end if;
  return r;
end $$;

-- Role/rate/active changes (Team & access) require aal2 in addition to Admin role.
create or replace function set_profile_role(p_profile uuid, p_role app_role) returns profiles
language plpgsql security definer set search_path = public as $$
declare r profiles;
begin
  perform require_aal2('changing a role');
  if not has_role('Admin') then raise exception 'Only an Admin can change roles'; end if;
  update profiles set role = p_role where id = p_profile returning * into r;
  if r.id is null then raise exception 'Profile not found'; end if;
  return r;
end $$;

-- Direct UPDATE paths for approvals must also require aal2 (RPCs above plus these policies).
drop policy if exists exp_review on expenses;
create policy exp_review on expenses for update to authenticated
  using (has_role('CrewLead','Finance','Admin') and is_aal2())
  with check (has_role('CrewLead','Finance','Admin') and is_aal2());

drop policy if exists te_review on time_entries;
create policy te_review on time_entries for update to authenticated
  using (has_role('CrewLead','Finance','Admin') and is_aal2())
  with check (has_role('CrewLead','Finance','Admin') and is_aal2());

-- Role/rate/active/customer-link changes need Admin AND a verified second factor.
create or replace function guard_profile_update() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null
     and (new.role, new.hourly_rate_cents, new.active, new.customer_id) is distinct from (old.role, old.hourly_rate_cents, old.active, old.customer_id)
     and (not has_role('Admin') or not is_aal2()) then
    raise exception 'Only an Admin with two-factor authentication can change role, rate, active status or customer link';
  end if;
  return new;
end $$;

revoke all on function respond_estimate, invoice_from_estimate, review_expense, review_time_entry, set_profile_role, is_aal2, require_aal2 from public;
grant execute on function respond_estimate, invoice_from_estimate, review_expense, review_time_entry, set_profile_role to authenticated;
grant execute on function is_aal2, require_aal2 to authenticated;
