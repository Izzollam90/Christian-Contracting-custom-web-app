-- F14: settings carried two `using (true)` SELECT policies, so every signed-in
-- customer could read business configuration and the MFA-reset audit rows written by
-- admin_reset_mfa (which contain the admin's and target user's email addresses).
-- No application code reads `settings`; service_categories and time_slots keep their
-- open read because the request form needs them.
drop policy if exists admin_read_settings on settings;
drop policy if exists read_lookups on settings;
create policy staff_read_settings on settings for select to authenticated
  using (is_staff());
