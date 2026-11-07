# AGENTS.md: instructions for coding agents (Mistral Vibe and others)

You are finishing the **Herkey Maintenance** apps: a Customer web app and a Crew & Office web app, with **Google + passkey sign-in only**, **two-factor authentication** on money and access actions, shared live data, and home-screen install. (Apple sign-in was dropped on Nov 6. See HANDOFF.md Phase 7.)

## Start here
1. Read `HANDOFF.md` in full. It has the plan, phases, done-criteria and the decisions the owner still owes.
2. Read `docs/requirements.md`. It's the behavior spec; follow it over anything you assume.
3. Open `prototype/customer-portal.html` and `prototype/crew-portal.html` in a browser. They are the **approved design**: match their layout, colors, fonts, copy and animated backgrounds.
4. Work the phases in `HANDOFF.md §5` in order. Don't start a phase until the previous phase's done-criteria pass.

## Hard rules
- **Security in the database.** Use Supabase row-level security and the RPCs in `supabase/migrations/`. Never rely on hiding UI as access control.
- **Never commit secrets** (`.env.local`, service role keys, OAuth secrets). Use `.env.example` for names only.
- **Never use real people's data.** Only the fictional rows in `glide/data/*.csv`.
- Money in **integer cents**; timestamps stored **UTC**, shown in `America/New_York`.
- Job statuses: `Requested, Accepted, Scheduled, In Progress, Completed, On Hold, Canceled`. Estimate, invoice, expense and time-review states are separate (see the schema enums).
- Don't add the first-release exclusions (photos, SMS/email automation, payments, accounting, Google integrations, multi-business).
- When you must decide something not covered, pick the simplest option, write it in `docs/decisions.md`, and keep going. Stop and ask the owner only for the items marked as blockers in `HANDOFF.md §3`.

## Things you cannot do yourself (ask the owner)
Creating Supabase, Google Cloud, Apple Developer, GitHub, or Vercel/Netlify accounts and pasting their keys. `HANDOFF.md §4` lists exactly what to ask for.

## Repo layout (target)
```
apps/customer      Customer web app (Vite + React + TS, PWA)
apps/staff         Crew & Office web app (Vite + React + TS, PWA)
packages/shared    Supabase client, generated DB types, design tokens, shared UI
supabase/          migrations, seed.sql, tests
prototype/         approved HTML designs (reference, don't ship)
glide/             Glide data + build guides (separate track)
docs/              requirements, decisions, source notes
```

## Definition of done (whole project)
The full flow from requirements §10 passes on a real Android phone and a real iPhone, with five accounts (Customer, Crew, CrewLead, Finance, Admin), each signed in with Google or a passkey, with 2FA on every money and access action. Every forbidden access is proven blocked by `supabase/tests`.
