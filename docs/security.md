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
  `active` or `customer_id` on any profile — nobody can promote themselves. When a signed-in
  Admin changes these, the trigger also requires `is_aal2()` (a verified 2FA session).
  Admin-only contexts (service role / SQL editor, where `auth.uid()` is null) are allowed.
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
42 assertions covering cross-customer reads, crew privacy (job board, time, expenses, invoices),
self-role-escalation, double claims, cancel/answer permissions, invoice permissions, time
review, and 11 MFA checks (every money/access action fails at aal1 and passes at aal2)
— plus the two-session claim race. Run it with `pnpm test:db`.

> Note: `run-local.mjs` applies `0001_init.sql` and `0002_mfa_and_signin.sql` only. The
> hardening migrations below (`0003`–`0013`) are applied to the hosted project through the
> Supabase migration tool and are not represented in the local harness, so the assertion
> "Finance can read invoices at aal1" in `rls_checks.sql` now describes the pre-hardening
> schema. In the hosted database, office reads of `invoices` require aal2.

## Hardening pass (security audit)

Applied as migrations `0003`–`0013`:

- `guard_profile_update()` compared `new.hourly_rate_cents` against itself in the non-Admin
  branch, so any signed-in user could raise their own pay rate. Fixed to compare `old.`.
- New `guard_time_entry_update()` trigger: only a CrewLead/Finance/Admin at aal2 may change
  `review`, only those roles may change `clock_in`, and `user_id` can never be reassigned.
  Previously `te_clock_out` let the owner of an open entry write any column of that row.
- `job_board` is a security-definer view and was auto-updatable with Supabase's default
  INSERT/UPDATE/DELETE grants, routing writes to `jobs` without applying `jobs` RLS.
  Now `SELECT` to `authenticated` only; all privileges revoked from `anon`.
  The view intentionally stays owner-rights (crew must see jobs they do not own yet).
- `is_aal2()` added to `inv_office_select`, `inv_office_insert`, `inv_office_delete` and the
  `invoice_lines` office policies. Customers keep their own un-gated read.
- `est_staff_write` replaced with per-verb policies; setting an estimate to `Accepted`
  now requires aal2 on the table as well as in `respond_estimate`.
- `handle_new_user()` links a new account to an existing customer record only when the
  address is confirmed (`email_confirmed_at is not null`), and resolves deterministically.
- Unique index on `lower(email)` for `customers`, matching the lookup the trigger uses.
- `settings` reads restricted to `is_staff()` — the two `using (true)` policies published
  business configuration and the MFA-reset audit rows (which carry email addresses).
- `EXECUTE` revoked from `anon` (and from `PUBLIC` where the default grant survived) on
  every SECURITY DEFINER function; trigger functions are off the API entirely.
- `search_path = public` pinned on `set_street_name`, `is_staff`, `has_role`, `is_aal2`,
  `guard_profile_update`, `guard_time_entry_update`.

In the apps: raw database error text is no longer rendered (`friendlyError()` in
`packages/shared/src/errors.ts` passes the app's own messages through and replaces
everything else); removing a 2FA factor now requires a step-up code; and the staff
email-invite flow, which created accounts from a typed-in address, was removed.

Still required from the owner: disable the email / magic-link provider in
Supabase → Authentication → Providers, leaving only Google and passkeys.

## Auth

- Sign-in methods: **Google** and **passkey (WebAuthn)** only.
  Apple, Facebook, X, password, and magic link were removed (owner decision, Nov 6).
  Enable Google in Supabase → Authentication → Providers. Enable passkeys and MFA (TOTP) in
  Supabase → Authentication → Settings.
- **Two-factor authentication (TOTP)**: Admin and Finance must set up 2FA before they can open
  any screen; all other roles need it at the moment of a money or access action (step-up). The
  database enforces this: `is_aal2()` checks `auth.jwt() ->> 'aal' = 'aal2'` and is required in
  `respond_estimate` (accept path), `invoice_from_estimate`, invoice/expense/time update policies,
  the profile guard trigger, customer address updates, and settings writes.
  See `supabase/migrations/0002_mfa_and_signin.sql`.
- An Admin can reset another user's MFA factors via `admin_reset_mfa(target_uuid)` — Admin-only,
  aal2 required, cannot reset own factors.
- OAuth uses the **PKCE** flow (`flowType: 'pkce'`); sessions persist in storage and auto-refresh.
- Redirect URLs are allow-listed in the Supabase dashboard (localhost for dev + the two production
  URLs).
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

1. Enable **Google** in Authentication → Providers and paste the client ID/secret from Google Cloud Console.
2. Add production URLs to the Auth redirect allow-list (dev: `http://localhost:5173`,
   `http://localhost:5174`).
3. Enable **MFA (TOTP)** in Authentication → Settings so users can enroll authenticator-app factors.
4. **Passkeys (WebAuthn):** Authentication → Passkeys — enable, display name "Herkey
   Maintenance", dev RP ID `localhost`, allowed origins `http://localhost:5173` and
   `http://localhost:5174`. In production use the real domain + HTTPS origins. Passkeys are
   enabled by default in `@supabase/supabase-js` 2.119+ (no client flag needed); the apps call
   `auth.signInWithPasskey()` / `auth.registerPasskey()`.
5. Turn on the **Security Advisor** and resolve any warnings (RLS coverage, function grants).
6. Keep the secret key (`sb_secret_…` / service role) out of the repo and out of chat; it
   bypasses RLS. Rotate immediately if it is ever exposed. Only `scripts/seed-users.ts` uses it.
7. Consider Supabase Vault for any future server-side secrets; never put them in client env vars.

## Local env layout

Both Vite apps set `envDir` to the repo root, so one root `.env.local` feeds both apps:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable `sb_publishable_…` key works here),
`VITE_COMPANY_NAME`, `VITE_TIMEZONE`. `SUPABASE_SERVICE_ROLE_KEY` stays in the root `.env.local`
for Node scripts only — never `VITE_`-prefixed, never imported by frontend code.
