# Herkey Maintenance Apps

Two apps for Herkey Maintenance:
- a **Customer app** for requesting service, tracking jobs, and handling estimates and invoices
- a **Crew & Office app** for Crew, Crew Lead, Finance and Admin

Both need Google and passkey sign-in, two-factor authentication on money and access actions, shared live data, and installable website versions.

## Quick start

```
pnpm install
cp .env.example .env.local    # paste the Project URL and Publishable key from Supabase
pnpm check                    # check browser credentials, Data API reachability, Google, and passkeys
pnpm dev:customer             # http://localhost:5173
pnpm dev:staff     # http://localhost:5174 (use a second terminal)
```

Run `pnpm check` for setup diagnostics. It uses the browser key, so verify seed data and staff access after signing in. In Supabase → Authentication → URL Configuration, add `http://localhost:5173` and `http://localhost:5174` to Redirect URLs.

- Under Authentication → Providers → Google, save the Google OAuth client ID and secret. In Google Cloud, set the authorized redirect URI to `https://<project-ref>.supabase.co/auth/v1/callback`.
- For a local-only Supabase project, configure Authentication → Passkeys with the relying party ID `localhost` and both local origins above. For production, use a stable domain shared by both app origins and list their HTTPS origins. Changing the relying party ID invalidates existing passkeys.

For coding agents finishing the build: start with [`AGENTS.md`](AGENTS.md) and [`HANDOFF.md`](HANDOFF.md).

| Folder | Contents |
|---|---|
| `prototype/` | Approved HTML designs. Open in a browser. Live previews (private until shared): [Customer](https://claude.ai/artifact/CmT9xHGcVvZzAkBMBqvR2q) · [Crew & Office](https://claude.ai/artifact/D4Y5B3ju1HQiMB4nTHfGNH) |
| `glide/` | Shared Glide data workbook (17 tables), CSVs, and setup guides for both Glide apps |
| `supabase/` | Database schema, privacy rules and server functions for the website versions |
| `docs/` | Consolidated requirements, decisions log, and the owner's original notes |

All people, jobs and amounts in this repo are fictional sample data.

## Build & run (web apps)

```
pnpm install
cp .env.example .env.local    # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
pnpm check                    # check .env.local and live Supabase browser configuration
pnpm dev:customer             # customer app
pnpm dev:staff     # crew & office app
pnpm typecheck && pnpm build  # verify
pnpm test:db                  # migration + seed + RLS proof on embedded Postgres
```

Database setup for a new project: apply all files in `supabase/migrations/` in order, load
`supabase/seed.sql`, then create the sample staff with `pnpm seed:users` (needs
`SUPABASE_SERVICE_ROLE_KEY` in `.env.local`; scripts only, never the browser). Sign-in is Google + passkey only.
MFA (TOTP) is enabled in Supabase → Authentication. See [docs/security.md](docs/security.md)
for the full security model and [HANDOFF.md](HANDOFF.md) for the phased plan.
