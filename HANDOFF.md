# Handoff: Herkey Maintenance apps

> **Status (web track):** Phases 1–5 code is complete on branch `vibe/web-apps-9a27e0` (PR #1): migration fixed + proven by `pnpm test:db` (31 RLS checks + claim race), seed + `pnpm seed:users`, monorepo with both PWAs, sign-in via Google/Apple/Facebook/X/passkey/password/magic-link, PWA + security headers, `pnpm check` setup validator, CI workflow. Remaining owner-side: create the Supabase project + enable providers, apply migration/seed, deploy both apps, merge PR #1. Phase 6 (Glide) still waits on decision D1.

**For:** the coding agent (Mistral Vibe) and the owner.
**Goal:** ship two apps, a **Customer app** and a **Crew & Office app**, with **Google and Apple sign-in**, shared live data, and a **website version of each** that installs to a phone home screen. The Glide build is the other track; the websites are its backup.

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
3. **Apple sign-in**: requires an **Apple Developer Program** membership (paid, yearly). Create a Services ID and a Sign in with Apple key, and use the same Supabase callback URL. Paste them into Supabase → Providers → Apple. **Apple only works on a real HTTPS domain**, not localhost.
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

## 6. Rules for the agent
- **No real personal data in the repo.** The owner has a Glide export with real customer names and addresses. Never commit it or copy from it. Use only `glide/data/*.csv` (fictional).
- Never commit secrets. `.env.local` is in `.gitignore`.
- Money in integer cents; timestamps in UTC; display in `America/New_York`.
- Security lives in the database (RLS and RPCs). The UI may hide things too, but it must never be the only guard.
- Don't build the "later" features (requirements §9) unless the owner moves them in.
- Keep `docs/decisions.md` updated with any choice that isn't in this file.
- Small commits; one phase per pull request if GitHub is set up.
