# Decisions log

Record each choice not already in HANDOFF.md: date, decision, why, and who decided (owner or agent).

| Date | Decision | Why | By |
|---|---|---|---|
| 2026-11-06 | Two separate apps (Customer; Crew & Office) sharing one data source | Owner request | Owner |
| 2026-11-06 | Company name on screen: Herkey Maintenance | Named in notes and key points; Lancaster site was only a style reference | Owner |
| 2026-11-06 | Google and Apple sign-in required; website version of each app as backup | Owner request | Owner |
| 2026-11-06 | Proposed stack: Supabase + Vite/React/TS PWAs on Vercel or Netlify | Built-in Google/Apple auth, row-level security, realtime | Claude (proposal) |
| 2026-11-06 | Sign-in methods: Google, Apple, Facebook, X, passkey (WebAuthn), email+password, magic link — all via Supabase Auth | Owner asked for multiple social sign-ins plus "a key" (clarified: passkey) | Owner |
| 2026-11-06 | Security model documented in docs/security.md; RLS proven by supabase/tests (31 checks + claim race) on embedded Postgres via `pnpm test:db` | Owner asked for top-notch security on financial data | Agent |
| 2026-11-06 | Monorepo: pnpm workspaces with apps/customer, apps/staff, packages/shared (no build step for shared) | HANDOFF §2 stack | Agent |
| 2026-11-06 | Passkey sign-up flow: create account via password/magic link, then "Add passkey" registers a WebAuthn credential (auth-js 2.119 API: signInWithPasskey / registerPasskey) | Newer supabase-js renamed the WebAuthn methods | Agent |
| 2026-11-06 | D1 default (c): websites are the live system for now; glide/ stays as reference until the owner picks a Glide plan with SQL sources | Never run two live databases | Agent (default per HANDOFF) |
| 2026-11-06 | D2: hosting provider free subdomains until the owner buys a domain | No domain decision yet | Agent (default) |
| 2026-11-06 | **Sign-in reduced to Google + passkey only.** Remove Apple, Facebook, X, email+password, magic link. Supersedes the two sign-in rows above | Owner request | Owner |
| 2026-11-06 | **Two-factor (TOTP) required** for Admin/Finance always; step-up 2FA for money and access actions for everyone, enforced in the DB via `aal2` (requirements §11) | Owner: "so people can't just send money" | Owner |
| 2026-11-06 | **Web app first**; app-store builds later as a separate project. Confirms D1 (c): websites are the live system | Owner request | Owner |
| 2026-11-06 | D4/D5/D6 defaults adopted: preferred time confirmed by office; no completion approval; 200 m geofence, 1.5× after 40 h/wk | HANDOFF §3 defaults | Agent |
