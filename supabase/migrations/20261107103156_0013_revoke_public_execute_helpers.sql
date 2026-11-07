-- F15 follow-up: these three still had the default PUBLIC EXECUTE grant, which a
-- revoke from `anon` does not remove. my_role/my_customer_id must stay callable by
-- signed-in users (policies and the client depend on them); handle_new_user is a
-- trigger function and should not be on the API at all.
revoke execute on function public.my_role() from public;
revoke execute on function public.my_customer_id() from public;
revoke execute on function public.handle_new_user() from public;
grant execute on function public.my_role() to authenticated;
grant execute on function public.my_customer_id() to authenticated;
