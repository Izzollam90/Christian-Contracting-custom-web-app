-- F1: the non-Admin branch of guard_profile_update compared new.hourly_rate_cents
-- against itself, so a user could raise their own pay rate. Compare against old.
-- F16: pin search_path on the trigger function.
create or replace function guard_profile_update() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null
     and (new.role, new.hourly_rate_cents, new.active, new.customer_id)
         is distinct from (old.role, old.hourly_rate_cents, old.active, old.customer_id)
     and not has_role('Admin') then
    raise exception 'Only an Admin can change role, rate, active status or customer link';
  end if;
  if auth.uid() is not null
     and (new.role, new.hourly_rate_cents, new.active, new.customer_id)
         is distinct from (old.role, old.hourly_rate_cents, old.active, old.customer_id)
     and has_role('Admin') and not is_aal2() then
    raise exception 'Two-factor authentication required to change roles, rates or access';
  end if;
  return new;
end $$;
