-- F2 / F4: te_clock_out lets the owner of an open time entry update ANY column of
-- that row, including `review` (self-approval of payroll) and `clock_in` (backdating).
-- Row policies are row-level, so restrict the sensitive columns with a trigger.
create or replace function guard_time_entry_update() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;  -- service role / SQL editor
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'A time entry cannot be reassigned to another person';
  end if;

  if new.clock_in is distinct from old.clock_in
     and not has_role('CrewLead','Finance','Admin') then
    raise exception 'Only a lead, Finance or an Admin can change a clock-in time';
  end if;

  if new.review is distinct from old.review then
    if not has_role('CrewLead','Finance','Admin') then
      raise exception 'Only a lead, Finance or an Admin can review time entries';
    end if;
    if not is_aal2() then
      raise exception 'Two-factor authentication required to review time entries';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists time_entries_guard on time_entries;
create trigger time_entries_guard before update on time_entries
  for each row execute function guard_time_entry_update();
