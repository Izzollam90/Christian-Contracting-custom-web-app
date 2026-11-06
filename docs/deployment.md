# Deployment runbook

Both apps are static Vite builds; host each as its own project. Vercel or Netlify both work —
configs for both are in the repo (`vercel.json` / `netlify.toml` per app).

## Vercel (recommended)

1. New Project → import `Izzollam90/herkey-maintenance-app`.
2. **Customer app** project: Root Directory `apps/customer`, Build `pnpm build` (or `npm run build`),
   Output `dist`. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_COMPANY_NAME`, `VITE_TIMEZONE` (copy from your root `.env.local`).
3. **Staff app** project: same with Root Directory `apps/staff`.
4. Note the two production URLs (e.g. `app.example.com`, `crew.example.com`).

## Netlify

1. New site from the repo; per app set Base directory `apps/customer` (or `apps/staff`),
   Build command `pnpm build`, Publish directory `dist` (see `apps/*/netlify.toml`).
2. Add the same `VITE_*` environment variables in Site settings → Environment.

## After both are live

1. Supabase → Authentication → URL Configuration: add both production URLs (and callback paths)
   to Redirect URLs; set Site URL to the customer app URL.
2. Google Cloud / Apple / Meta / X consoles: add `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
   (already) and the production origins where needed.
3. Passkeys: Authentication → Passkeys — set RP ID to the production domain and allowed origins
   to the HTTPS app URLs (changing RP ID invalidates existing passkeys).
4. Smoke test on a real Android phone and iPhone: install both apps from the browser
   (Add to Home Screen), sign in with Google, Apple, and a passkey, and run the full flow:
   customer requests → crew claims → lead schedules → crew completes → finance invoices →
   customer sees the invoice, live on both sides.
5. Run `pnpm test:db` locally once more against a scratch Supabase project before go-live.

## Rollback

Revert to the previous deploy in the hosting dashboard; the database is unaffected (RLS is in
the migration, not the deploy).
