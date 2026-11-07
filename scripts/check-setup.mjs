// Guided setup check: verifies .env.local against your real Supabase project and prints a
// checklist with the exact next step for anything missing. Usage: pnpm check
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const pass = (m) => console.log(`  PASS  ${m}`);
const fail = (m, next) => { failures++; console.log(`  FAIL  ${m}\n        -> ${next}`); };
const info = (m) => console.log(`  ..    ${m}`);

console.log('Herkey setup check\n');

// 1. .env.local exists and parses
const envPath = join(root, '.env.local');
if (!existsSync(envPath)) {
  fail('.env.local not found', 'cp .env.example .env.local and fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY from Supabase -> Project Settings -> API');
} else {
  pass('.env.local exists');
}
const env = {};
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !m[2].startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const url = env.VITE_SUPABASE_URL ?? '';
const anon = env.VITE_SUPABASE_ANON_KEY ?? '';
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
  fail('VITE_SUPABASE_URL is missing or malformed', 'copy "Project URL" from Supabase -> Project Settings -> API (looks like https://xxxx.supabase.co)');
} else pass('VITE_SUPABASE_URL looks right');
if (!anon) fail('VITE_SUPABASE_ANON_KEY is empty', 'copy the "anon public" key from the same page. Never paste the service_role key here.');
else pass('VITE_SUPABASE_ANON_KEY is set');

if (!url || !anon) {
  console.log(`\n${failures} problem(s). Fix the above and run pnpm check again.`);
  process.exit(1);
}

// 2. Project reachable + migration applied + seed applied + staff exist (anon key, RLS applies)
const headers = { apikey: anon, Authorization: `Bearer ${anon}` };
const rest = async (path, opts = {}) => {
  const res = await fetch(`${url}/rest/v1/${path}`, { ...opts, headers: { ...headers, ...(opts.headers ?? {}) } });
  let body = null;
  try { body = await res.json(); } catch { /* empty */ }
  return { status: res.status, body };
};

console.log('\nChecking your Supabase project...');
try {
  const health = await fetch(`${url}/auth/v1/health`, { headers });
  if (health.ok) pass('project is reachable, auth is up');
  else fail('auth health endpoint returned ' + health.status, 'check VITE_SUPABASE_URL — it must be your own project, not a placeholder');
} catch (e) {
  fail('cannot reach ' + url, 'check the URL and your connection: ' + e.message);
}

const settings = await rest('settings?select=key&limit=1');
if (settings.status === 200) {
  pass('migration 0001_init.sql is applied (settings table exists)');
} else if (settings.status === 401 || settings.status === 403 || settings.status === 404 || settings.body?.code === '42P01' || settings.body?.code === 'PGRST205') {
  fail('database schema not found', 'open the Supabase SQL editor and run supabase/migrations/0001_init.sql, then run pnpm check again');
} else {
  info(`settings query returned ${settings.status} (${settings.body?.message ?? 'no message'})`);
}

if (settings.status === 200) {
  const customers = await rest('customers?select=id&limit=1');
  if (customers.status === 200 && Array.isArray(customers.body) && customers.body.length > 0) {
    pass('seed.sql loaded (sample customers present)');
  } else {
    fail('sample data not loaded', 'run supabase/seed.sql in the SQL editor (AFTER the migration). Sample staff sign-ins come from: SUPABASE_SERVICE_ROLE_KEY=... in .env.local, then pnpm seed:users');
  }
  const staff = await rest('profiles?select=role&role=neq.Customer&limit=1');
  if (staff.status === 200 && Array.isArray(staff.body) && staff.body.length > 0) {
    pass('staff accounts exist with roles (seed:users done)');
  } else {
    fail('no staff roles yet', 'add SUPABASE_SERVICE_ROLE_KEY to .env.local (API page, scripts only) and run pnpm seed:users');
  }
}

console.log('\nThen, in the Supabase dashboard:');
console.log('  - Authentication -> Providers: enable Google; paste the client ID+secret from Google Cloud Console');
console.log('  - Authentication -> Settings: enable WebAuthn passkeys and MFA (TOTP)');
console.log('  - Authentication -> URL Configuration: add http://localhost:5173 and your deploy URLs');
console.log('  - Authentication -> Settings: enable WebAuthn passkeys (needs HTTPS in production)');
console.log('\nFinally: pnpm install && pnpm dev:customer  (and pnpm dev:staff in another terminal)');
console.log(failures === 0 ? '\nSETUP LOOKS GOOD' : `\n${failures} problem(s) to fix — run pnpm check again after each fix.`);
process.exit(failures === 0 ? 0 : 1);
