-- F3: job_board is a security-definer (owner rights) auto-updatable view over jobs.
-- Supabase default privileges gave anon + authenticated INSERT/UPDATE/DELETE on it,
-- which routes writes to `jobs` WITHOUT applying jobs RLS. Read-only, staff only.
revoke all on table public.job_board from anon;
revoke insert, update, delete on table public.job_board from authenticated;
grant select on table public.job_board to authenticated;
