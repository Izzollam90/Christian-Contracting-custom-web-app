-- F16: these five functions ran with a mutable search_path. is_staff/has_role decide
-- most policy outcomes, is_aal2 is the basis of every 2FA gate, and guard_profile_update
-- is the role-escalation trigger. (guard_profile_update was already pinned in 0003.)
alter function public.set_street_name() set search_path = public;
alter function public.is_staff() set search_path = public;
alter function public.has_role(app_role[]) set search_path = public;
alter function public.is_aal2() set search_path = public;
alter function public.guard_profile_update() set search_path = public;
alter function public.guard_time_entry_update() set search_path = public;
