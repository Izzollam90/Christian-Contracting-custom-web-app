# Herkey Maintenance Apps

Two apps for Herkey Maintenance:
- a **Customer app** for requesting service, tracking jobs, and handling estimates and invoices
- a **Crew & Office app** for Crew, Crew Lead, Finance and Admin

Both need Google and Apple sign-in, shared live data, and installable website versions.

## Quick start

```
pnpm install
cp .env.example .env.local    # paste Project URL + anon public key from Supabase -> Project Settings -> API
pnpm check                    # PASS/FAIL checklist against your live Supabase project; prints the exact fix for anything missing
pnpm dev:customer             # http://localhost:5173
pnpm dev:staff                # http://localhost:5174
```

The checker is `pnpm check` — bare `pnpm setup` is a pnpm builtin and never runs the repo script.

For coding agents finishing the build: start with [`AGENTS.md`](AGENTS.md) and [`HANDOFF.md`](HANDOFF.md).

| Folder | Contents |
|---|---|
| `prototype/` | Approved HTML designs. Open in a browser. Live previews (private until shared): [Customer](https://claude.ai/artifact/CmT9xHGcVvZzAkBMBqvR2q) · [Crew & Office](https://claude.ai/artifact/D4Y5B3ju1HQiMB4nTHfGNH) |
| `glide/` | Shared Glide data workbook (17 tables), CSVs, and setup guides for both Glide apps |
| `supabase/` | Database schema, privacy rules and server functions for the website versions (not yet run) |
| `docs/` | Consolidated requirements, decisions log, and the owner's original notes |

All people, jobs and amounts in this repo are fictional sample data.

## Build & run (web apps)

```
pnpm install
cp .env.example .env.local    # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
pnpm check                    # check .env.local against the live project until all PASS
pnpm dev:customer             # customer app
pnpm dev:staff                # crew & office app
pnpm typecheck && pnpm build  # verify
pnpm test:db                  # migration + seed + RLS proof on embedded Postgres
```

Database setup: apply `supabase/migrations/0001_init.sql` in the Supabase SQL editor, load
`supabase/seed.sql`, then create the sample staff with `pnpm seed:users` (needs
`SUPABASE_SERVICE_ROLE_KEY` in `.env.local`; scripts only, never the browser). Sign-in methods (Google, Apple, Facebook, X, passkey, password,
magic link) are enabled in Supabase → Authentication → Providers. See [docs/security.md](docs/security.md)
for the full security model and [HANDOFF.md](HANDOFF.md) for the phased plan.
