-- Herkey Maintenance: MFA enforcement + sign-in trim (Phase 7).
-- Adds is_aal2() helper, requires aal2 on every money/access RPC and policy,
-- and adds an Admin-only RPC to remove another user's MFA factors (with audit).
-- Does NOT edit 0001_init.sql. All changes are additive or replace existing functions.

-- ============ AAL helper ============
create or replace function is_aal2() returns boolean language sql stable as
  $$ select coalesce(auth.jwt() ->> 'aal', '') = 'aal2' $$;

-- ============ RPCs: require aal2 on the accept path ============
create or replace function respond_estimate(p_estimate text, p_accept boolean, p_comment text default null) returns estimates
language plpgsql security definer set search_path = public as $$
declare r estimates;
begin
  if p_accept and not is_aal2() then
    raise exception 'Two-factor authentication required to accept an estimate';
  end if;
  update estimates e set status = case when p_accept then 'Accepted'::estimate_status else 'Rejected' end, responded_at = now(), customer_comment = p_comment
   where e.id = p_estimate and e.status = 'Sent'
     and exists (select 1 from jobs j where j.id = e.job_id and j.customer_id = my_customer_id())
   returning * into r;
  if r.id is null then raise exception 'Estimate not found or already answered'; end if;
  insert into activity_log (job_id, actor_id, action) values (r.job_id, auth.uid(), 'Customer ' || case when p_accept then 'accepted' else 'declined' end || ' estimate ' || r.id);
  return r;
end $$;

create or replace function invoice_from_estimate(p_estimate text) returns invoices
language plpgsql security definer set search_path = public as $$
declare e estimates; i invoices;
begin
  if not is_aal2() then raise exception 'Two-factor authentication required to create invoices'; end if;
  if not has_role('Finance','Admin') then raise exception 'Not allowed'; end if;
  select * into e from estimates where id = p_estimate and status = 'Accepted';
  if e.id is null then raise exception 'Estimate must be Accepted'; end if;
  insert into invoices (job_id, estimate_id) values (e.job_id, e.id) returning * into i;
  insert into invoice_lines (invoice_id, description, quantity, unit_price_cents)
    select i.id, description, quantity, unit_price_cents from estimate_lines where estimate_id = e.id;
  insert into activity_log (job_id, actor_id, action, visible_to_customer) values (e.job_id, auth.uid(), 'Invoice ' || i.id || ' drafted from ' || e.id, false);
  return i;
end $$;

-- ============ Invoice update: aal2 required for send/paid/void ============
drop policy if exists inv_office on invoices;
create policy inv_office_select on invoices for select to authenticated using (has_role('Finance','Admin'));
create policy inv_office_insert on invoices for insert to authenticated with check (has_role('Finance','Admin'));
create policy inv_office_update on invoices for update to authenticated
  using (has_role('Finance','Admin'))
  with check (has_role('Finance','Admin') and is_aal2());
create policy inv_office_delete on invoices for delete to authenticated using (has_role('Finance','Admin'));

-- ============ Expense review: aal2 required ============
drop policy if exists exp_review on expenses;
create policy exp_review on expenses for update to authenticated
  using (has_role('CrewLead','Finance','Admin'))
  with check (has_role('CrewLead','Finance','Admin') and is_aal2());

-- ============ Time review: aal2 required ============
drop policy if exists te_review on time_entries;
create policy te_review on time_entries for update to authenticated
  using (has_role('CrewLead','Finance','Admin'))
  with check (has_role('CrewLead','Finance','Admin') and is_aal2());

-- ============ Profile role/rate/active changes: aal2 required ============
create or replace function guard_profile_update() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null
     and (new.role, new.hourly_rate_cents, new.active, new.customer_id) is distinct from (old.role, old.hourly_rate_cents, old.active, old.customer_id)
     and not has_role('Admin') then
    raise exception 'Only an Admin can change role, rate, active status or customer link';
  end if;
  if auth.uid() is not null
     and (new.role, new.hourly_rate_cents, new.active, new.customer_id) is distinct from (old.role, old.hourly_rate_cents, old.active, old.customer_id)
     and has_role('Admin') and not is_aal2() then
    raise exception 'Two-factor authentication required to change roles, rates or access';
  end if;
  return new;
end $$;

-- ============ Customer email/address updates: aal2 required ============
drop policy if exists customer_update_own on customers;
create policy customer_update_own on customers for update to authenticated
  using (id = my_customer_id() or has_role('Admin'))
  with check ((id = my_customer_id() or has_role('Admin')) and is_aal2());

-- ============ Settings writes: aal2 required ============
drop policy if exists admin_write on settings;
create policy admin_read_settings on settings for select to authenticated using (true);
create policy admin_write_settings on settings for all to authenticated using (has_role('Admin')) with check (has_role('Admin') and is_aal2());

-- ============ Admin MFA reset ============
create or replace function admin_reset_mfa(p_target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_role('Admin') then raise exception 'Only an Admin can reset MFA'; end if;
  if not is_aal2() then raise exception 'Two-factor authentication required to reset MFA'; end if;
  if p_target = auth.uid() then raise exception 'Cannot reset your own MFA — ask another Admin or use the dashboard'; end if;
  delete from auth.mfa_factors where user_id = p_target;
  insert into settings (key, value, notes)
  values (
    'mfa_reset_' || p_target::text || '_' || extract(epoch from now())::bigint::text,
    'reset',
    'MFA factors removed by ' || coalesce((select email from profiles where id = auth.uid()), 'admin') || ' for ' || coalesce((select email from profiles where id = p_target), p_target::text)
  )
  on conflict (key) do nothing;
end $$;
revoke all on function admin_reset_mfa(uuid) from public;
grant execute on function admin_reset_mfa(uuid) to authenticated;

-- ============ Re-grant (idempotent) ============
grant execute on function claim_job, set_job_status, cancel_my_job, respond_estimate, invoice_from_estimate to authenticated;
