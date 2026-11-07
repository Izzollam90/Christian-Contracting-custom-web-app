-- F15: the migrations revoked EXECUTE from PUBLIC, but Supabase's default privileges
-- grant it explicitly to anon, and revoking from PUBLIC does not remove a direct grant.
-- Unauthenticated callers could reach the body of every SECURITY DEFINER function.
revoke execute on function public.claim_job(text) from anon;
revoke execute on function public.set_job_status(text, job_status, text) from anon;
revoke execute on function public.cancel_my_job(text) from anon;
revoke execute on function public.respond_estimate(text, boolean, text) from anon;
revoke execute on function public.invoice_from_estimate(text) from anon;
revoke execute on function public.admin_reset_mfa(uuid) from anon;
revoke execute on function public.my_role() from anon;
revoke execute on function public.my_customer_id() from anon;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.is_staff() from anon;
revoke execute on function public.has_role(app_role[]) from anon;
revoke execute on function public.is_aal2() from anon;
revoke execute on function public.guard_profile_update() from anon;
revoke execute on function public.guard_time_entry_update() from anon;
revoke execute on function public.set_street_name() from anon;

-- Trigger functions are never called as RPCs; keep them off the Data API entirely.
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.guard_profile_update() from authenticated;
revoke execute on function public.guard_time_entry_update() from authenticated;
revoke execute on function public.set_street_name() from authenticated;
