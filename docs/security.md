# Security model

Security lives in the **database**, not the UI. The anon key ships to every browser by design;
everything private is protected by Postgres row-level security (RLS) and security-definer RPCs.

## Data layer (`supabase/migrations/0001_init.sql`)

- **RLS enabled on every table.** Policies key off `auth.uid()` (the verified JWT `sub` claim),
  never off client-supplied IDs.
- **Customers** see only rows linked to their own `customer_id` (jobs, activity, non-draft
  estimates, non-draft invoices).
- **Crew** see jobs assigned to them; unclaimed jobs come only through the `job_board` view, which
  exposes street name (house number stripped by trigger) and no customer name/phone/address.
  Crew cannot read invoices at all, or other crew members' time/expenses.
- **Role changes**: a trigger blocks any non-Admin from changing `role`, `hourly_rate_cents`,
  `active` or `customer_id` on any profile — nobody can promote themselves. Admin-only contexts
  (service role / SQL editor, where `auth.uid()` is null) are allowed.
- **Atomic claim**: `claim_job` does a conditional `UPDATE ... WHERE crew_id IS NULL` — two
  simultaneous claims cannot both succeed (proven by a 12-round two-session race test).
- **All state changes go through RPCs** (`claim_job`, `set_job_status`, `cancel_my_job`,
  `respond_estimate`, `invoice_from_estimate`), each `SECURITY DEFINER` with
  `SET search_path = public`, and `EXECUTE` revoked from `public`, granted only to `authenticated`.
- Helper functions (`my_role`, `is_staff`, `has_role`, `my_customer_id`) are `SECURITY DEFINER
  STABLE` so policies never recurse into RLS-protected tables.
- Money in integer cents; timestamps UTC; the `job_board` view carries a `security_barrier` and
  an `is_staff()` filter so it cannot leak rows to customers.
- Real money-bearing rows (invoices, expenses, time) are writable only by their approver roles;
  spending reports count `Approved` expenses only.

## Proof

`supabase/tests/run-local.mjs` boots a real Postgres (embedded), stubs only the Supabase auth
primitives, applies the migration + seed, and runs `supabase/tests/rls_checks.sql`:
31 assertions covering cross-customer reads, crew privacy (job board, time, expenses, invoices),
self-role-escalation, double claims, cancel/answer permissions, invoice permissions, and time
review — plus the two-session claim race. Run it with `pnpm test:db`.

## Auth

- Sign-in methods: **Google, Apple, Facebook, X, passkey (WebAuthn), email+password, magic link**.
  Enable each provider in Supabase → Authentication → Providers (Apple and passkeys require a real
  HTTPS domain, not localhost).
- OAuth uses the **PKCE** flow (`flowType: 'pkce'`); sessions persist in storage and auto-refresh.
- Redirect URLs are allow-listed in the Supabase dashboard (localhost for dev + the two production
  URLs). Configure a **minimum password length** in Supabase → Auth → Policies.
- New sign-ups default to `Customer` via the `handle_new_user` trigger; staff roles are assigned by
  an Admin (Team & access). Staff invites go out as an email OTP; the Admin then sets the role.
- The **service role key never ships to the browser**; it is used only by `scripts/seed-users.ts`
  and lives in `.env.local` (gitignored). `.env.example` documents names only.

## Front end / transport

- Strict **CSP** in each `index.html` (`default-src 'self'`, `frame-ancestors 'none'`,
  `base-uri 'self'`, `form-action 'self'`), plus security headers in `vercel.json`
  (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`,
  HSTS). Deploy on HTTPS only.
- Geolocation is used only for the clock-in geofence check and is declared in `Permissions-Policy`.
- Service workers cache only same-origin static assets; API calls always go to Supabase over TLS.
- No secrets, tokens, or real personal data are committed; seed data is the fictional
  `glide/data/*.csv` set only.

## Operational checklist for the owner (Supabase dashboard)

1. Enable the providers you want and paste their client IDs/secrets.
2. Add production URLs to the Auth redirect allow-list.
3. Set password policy (min length) and keep email confirmations on.
4. Turn on the **Security Advisor** and resolve any warnings (RLS coverage, function grants).
5. Keep the service role key out of the repo; rotate it if it ever leaks.
6. Consider Supabase Vault for any future server-side secrets; never put them in client env vars.
