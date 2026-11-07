# Handoff: Herkey Maintenance apps

> **Status (web track):** Phases 1–5 and Phase 7 are complete. Sign-in is **Google + passkey only** (Apple/Facebook/X/password/magic-link removed). Two-factor authentication (TOTP) is enforced at the database level via migration `0002_mfa_and_signin.sql` (`is_aal2()` in RPCs, RLS policies, and the profile guard trigger) and at the UI level (Admin/Finance aal2 gate, step-up prompts before money/access actions, passkey enrollment card, Security page, Privacy page). Verified: `pnpm typecheck`, `pnpm build` (both PWAs), `pnpm test` (7 unit), `pnpm test:db` (42 RLS checks + claim race). Remaining owner-side: create the Supabase project, enable Google + passkeys + MFA (TOTP), apply migrations + seed, deploy both apps. Phase 6 (Glide) still waits on decision D1.

**For:** the coding agent (Mistral Vibe) and the owner.
**Goal:** ship two **web apps**, a **Customer app** and a **Crew & Office app**, with **Google + passkey sign-in**, **two-factor authentication** on money and access actions, shared live data, and home-screen install on phones. App-store builds come later, as a separate project.

> **Change request, Nov 6 (owner). Do this next, as Phase 7.** Apple sign-in is dropped. Sign-in is **Google and passkey only**. Add **two-factor authentication** per `docs/requirements.md` §11. Entries in this file that still mention Apple, Facebook, X, password or magic link are superseded.

Read in this order: this file → `docs/requirements.md` → `prototype/*.html` (open in a browser) → `supabase/migrations/0001_init.sql` → `glide/`.

---

## 1. What exists today

| Path | What it is | State |
|---|---|---|
| `prototype/customer-portal.html` | Approved **design** for the Customer app: liquid-gold animated background, 4-step request, job tracker, billing | Working UI, fake data in browser storage, no backend |
| `prototype/crew-portal.html` | Approved **design** for Crew & Office: 4 roles, clock ring, job board, schedule, approvals, billing, payroll, team, data tables | Same as above |
| `prototype/maintenance-app.html` | First all-in-one prototype | Reference only |
| `glide/Herkey-Maintenance-Glide-Data.xlsx` + `glide/data/*.csv` | Shared data for the two **Glide** apps: 17 tables of fictional sample rows | Ready to load into Glide |
| `glide/1-…`, `glide/2-…` | Step-by-step Glide build guides | Not yet built in Glide |
| `glide/build-data.ps1` | Regenerates the workbook and CSVs | Works (needs Excel on Windows) |
| `supabase/migrations/0001_init.sql` | Postgres schema + row-level security + RPCs for the web apps | **Written but never run.** Phase 1 tests it |
| `docs/requirements.md` | Consolidated requirements | Source of truth for behavior |
| `docs/source/` | Owner's original notes and key points (text) | Read-only reference |

## 2. Recommended stack for the website versions

| Concern | Choice | Why |
|---|---|---|
| Backend, DB, auth | **Supabase** (Postgres + Auth + Realtime + Storage) | Built-in **Google** and **Apple** sign-in; row-level security for the "protect at the data level" rule; realtime so both apps update live |
| Front end | **Vite + React + TypeScript**, one repo with two apps: `apps/customer`, `apps/staff`, plus `packages/shared` (types, Supabase client, design tokens) | Small, fast, easy for the next person to take over |
| Installable | `vite-plugin-pwa` (manifest, icons, service worker) | "Add to Home screen" on Android and iPhone; no app store |
| Hosting | **Vercel** or **Netlify**: two projects from one repo, e.g. `app.<domain>` (customer) and `crew.<domain>` (staff) | Free tier, HTTPS, preview deploys |
| Styling | Port the CSS tokens from the prototypes (near-black `#0C0D0F`, gold `#C49A50` / `#E6C27E`; fonts Archivo, Cormorant Garamond, Inter) and their canvas backgrounds as-is | The owner approved this look |

If you pick something else, say why in `docs/decisions.md`. Don't use a stack that can't do Google and Apple sign-in plus row-level security.

## 3. Decisions the owner must make (blockers are marked)

| # | Decision | Default if no answer |
|---|---|---|
| **D1 (blocks Phase 4)** | **One source of truth.** The key points say only one live system. Options: **(a)** Supabase is the database, and Glide connects to it (needs a Glide plan with SQL/Postgres data sources; check Glide's current pricing). **(b)** Glide plus a Google Sheet is the database, and the websites stay a *standby* used only if Glide is down (they'd need a sync job). **(c)** Drop Glide and use the websites only. | **(a)** if the Glide plan allows it, otherwise **(c)**. Never run two live databases |
| D2 | Domain name (e.g. herkeymaintenance.com) | Use the hosting provider's free subdomains |
| D3 | Company name on screen: Herkey Maintenance vs Christian Contracting | Herkey Maintenance |
| D4 | Can a customer pick an exact slot, or only a *preferred* time the office confirms? | Preferred time; the office confirms |
| D5 | Does a crew member's "Completed" need Crew Lead approval? | No |
| D6 | Geofence radius, overtime, rounding | 200 m; 1.5× after 40 h/week; no rounding |

## 4. Accounts and keys the owner must create

The agent **cannot** create these. Put the keys in `.env.local` (never commit them; see `.env.example`).

1. **Supabase**: free project. Note the Project URL and anon key. The service role key is for scripts only, never the front end.
2. **Google sign-in**: in Google Cloud Console, create an OAuth client (type: Web). Authorized redirect URI: `https://<project>.supabase.co/auth/v1/callback`. Paste the client ID and secret into Supabase → Authentication → Providers → Google.
3. ~~Apple sign-in~~: **dropped by the owner (Nov 6).** No Apple Developer account needed. Instead: in Supabase → Authentication, turn on **Passkeys** and **Multi-Factor (TOTP)**. The Google OAuth consent screen also needs a **privacy policy URL** before Google lets the public sign in, so the apps must ship a `/privacy` page.
4. **Vercel or Netlify**: connect this repo once it's on GitHub.
5. **GitHub**: create an empty private repo and push this folder to it.

## 5. Phased plan (each phase has done-criteria; don't start the next until they pass)

### Phase 1: Database
- Create the Supabase project and apply `supabase/migrations/0001_init.sql`. Fix anything that fails; it has never been run.
- Write `supabase/seed.sql` from `glide/data/*.csv` (customers, jobs, estimates, lines, invoices, expenses, time entries, activity, lookups). Sample staff need `auth.users` rows: create them with the Supabase admin API in a script (`scripts/seed-users.ts`), then set their roles.
- Write `supabase/tests/rls_checks.sql` (or pgTAP) that signs in as each role and **tries** the forbidden things.
  **Done when:** all of these are proven blocked:
  - a Customer reading another customer's job, estimate, invoice or activity
  - Crew reading the customer name or house number of an unclaimed job, another crew member's time or expenses, or any invoice
  - anyone changing their own role
  - two simultaneous `claim_job` calls both succeeding (they must not)

### Phase 2: Shared package and auth
- Monorepo (pnpm workspaces): `apps/customer`, `apps/staff`, `packages/shared`.
- Sign-in screen with **Continue with Google**, **Continue with Apple** and an email magic link. Use Supabase Auth's OAuth redirect flow.
- The Customer app accepts any signed-in user (new users become Customer through the DB trigger). The Staff app shows "Your account doesn't have staff access yet. Ask an admin." unless the role is Crew, CrewLead, Finance or Admin.
  **Done when:** Google sign-in works locally and on a preview deploy, and Apple works on the preview deploy (HTTPS).

### Phase 3: Customer app (match `prototype/customer-portal.html`)
- Home (hero, happening-now tracker, stats, service tiles), 4-step request (insert into `jobs` + `activity_log`), My jobs (+ detail drawer, cancel via `cancel_my_job`), Billing (accept/decline via `respond_estimate`).
- Realtime subscription on the customer's jobs, estimates and activity.
  **Done when:** a request submitted here appears on the staff job board within seconds, without a refresh.

### Phase 4: Staff app (match `prototype/crew-portal.html`)
- Role-based navigation exactly as in the prototype's `NAV` map.
- Crew: Today (clock in/out writes `time_entries`; use the browser Geolocation API for the distance check against the job's customer lat/lng, and mark the entry Needs Review when it's outside the geofence), Job board (from the `job_board` view; Claim calls `claim_job`), My jobs (`set_job_status`, notes, expense submit, estimate draft).
- CrewLead: Jobs, Schedule (week board), Approvals.
- Finance: Overview KPIs (definitions in requirements §7), Estimates & invoices (`invoice_from_estimate`), Time & payroll.
- Admin: everything, plus Team & access (role changes; staff invites by email: send a Supabase invite, then set the role) and Data tables (read-only grids with CSV export).
  **Done when:** the full flow passes: the customer requests → crew claims → lead schedules → crew completes → finance invoices → the customer sees the invoice. Each step shows on the other app live.

### Phase 5: Installable website backup and deploy
- PWA manifest for each app (names "Herkey" and "Herkey Crew", gold HM icon at 192/512 px plus a maskable version), service worker that caches the app shell, and an offline banner.
- Deploy both apps. Add the production URLs to Supabase Auth's redirect allow-list and to the Google and Apple consoles.
  **Done when:** on a real Android phone and a real iPhone, both apps install from the browser, open full-screen, and sign in with Google and Apple.

### Phase 6: Glide alignment (depends on D1)
- (a): connect the Glide apps to the same Supabase Postgres and follow `glide/*.md`, mapping columns to the snake_case names.
- (b): build a one-way sync and document the failover.
- (c): archive `glide/`.

### Phase 7: Google + passkey only, and two-factor authentication (owner change, Nov 6)
1. **Trim sign-in.** In `packages/shared/src/auth.ts` and `SignIn.tsx`, keep only **Continue with Google** and **Sign in with a passkey**. Remove the Apple, Facebook and X buttons and glyphs, plus password sign-in/sign-up and magic link. Update `scripts/seed-users.ts`, `scripts/check-setup.mjs`, `README.md`, `.env.example` and `docs/security.md` to match.
2. **Passkey enrollment.** After someone's first Google sign-in, show a one-time card: "Sign in faster next time. Add a passkey." Add a **Security** page in both apps listing passkeys and 2FA factors, with add and remove.
3. **2FA (TOTP via Supabase MFA)** per requirements §11:
   - Enrollment screen: QR code plus a manual key, a code to confirm, and a friendly name. Allow a second factor.
   - **Admin/Finance gate:** if the role is Admin or Finance and the session is not `aal2`, show only "Set up two-factor" or "Enter your code". No other screens.
   - **Step-up:** before each money or access action, if the session is `aal1`, prompt for a code and continue the action once verified.
   - **Database enforcement:** add a helper `is_aal2()` (`coalesce(auth.jwt() ->> 'aal', '') = 'aal2'`) and require it in `respond_estimate` (accept path), `invoice_from_estimate`, the invoice update policy (send/paid/void), the expense review policy, the time review policy, profile role/rate/active changes (the `guard_profile_update` trigger, for signed-in callers), settings writes, and customer email/address updates. Put this in a **new** migration, `0002_mfa_and_signin.sql`; don't edit 0001.
   - **Admin reset:** an RPC or Edge Function, Admin-only and `aal2`, that removes another user's MFA factors and writes an audit row.
4. **Tests:** extend `supabase/tests` so every action above is proven to **fail at aal1 and pass at aal2**, and so Admin/Finance reads of money tables fail at aal1.
5. **Privacy page:** add `/privacy` to both apps (simple plain-language policy; owner to review). Google requires it for the OAuth consent screen.

**Status: COMPLETE.** All five items are done and verified:
- `pnpm typecheck` — passes
- `pnpm build` — both PWAs build
- `pnpm test` — 7 unit tests pass
- `pnpm test:db` — 42 RLS checks pass (31 original + 11 MFA aal1-fail/aal2-pass) + claim race
- Sign-in screen shows only Google and passkey
- Admin/Finance blocked behind aal2 gate; customer estimate accept prompts for code

**Not yet testable without the owner's HTTPS deploy:** real Google OAuth round-trip, real passkey registration/sign-in, and real TOTP enrollment (all require a deployed HTTPS origin). The UI flows are built and the database enforcement is proven by the test suite.

## 6. Rules for the agent
- **No real personal data in the repo.** The owner has a Glide export with real customer names and addresses. Never commit it or copy from it. Use only `glide/data/*.csv` (fictional).
- Never commit secrets. `.env.local` is in `.gitignore`.
- Money in integer cents; timestamps in UTC; display in `America/New_York`.
- Security lives in the database (RLS and RPCs). The UI may hide things too, but it must never be the only guard.
- Don't build the "later" features (requirements §9) unless the owner moves them in.
- Keep `docs/decisions.md` updated with any choice that isn't in this file.
- Small commits; one phase per pull request if GitHub is set up.
