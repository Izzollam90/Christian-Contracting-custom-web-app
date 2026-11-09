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
    if (m && !m[2].startsWith('#')) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const url = (env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const key = env.VITE_SUPABASE_ANON_KEY ?? '';
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
  fail('VITE_SUPABASE_URL is missing or malformed', 'copy "Project URL" from Supabase -> Project Settings -> API (looks like https://xxxx.supabase.co)');
} else pass('VITE_SUPABASE_URL looks right');

let legacyRole;
try {
  legacyRole = JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString()).role;
} catch { /* Publishable keys are not JWTs. */ }
if (!/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key) && legacyRole !== 'anon') {
  fail('VITE_SUPABASE_ANON_KEY is missing or is not a browser key', 'copy the Publishable key (or legacy anon key) from Supabase -> Settings -> API Keys');
} else pass('VITE_SUPABASE_ANON_KEY has a browser key format');

if (failures) {
  console.log(`\n${failures} problem(s). Fix the above and run pnpm check again.`);
  process.exit(1);
}

// A browser key can check connectivity, but RLS protects customer and staff rows.
const request = (path) => fetch(`${url}${path}`, {
  headers: { apikey: key },
  signal: AbortSignal.timeout(15000),
});

console.log('\nChecking your Supabase project...');
try {
  const auth = await request('/auth/v1/settings');
  if (!auth.ok) {
    fail(`Supabase Auth returned HTTP ${auth.status}`, 'verify that the Project URL and Publishable key belong to the same project');
  } else {
    const settings = await auth.json();
    pass('Supabase Auth is reachable with your browser key');
    if (settings.external?.google === true) pass('Google sign-in is enabled');
    else fail('Google sign-in is disabled', 'enable Google under Supabase -> Authentication -> Providers and save the OAuth client ID and secret');

    const schema = await request('/rest/v1/service_categories?select=category&limit=0');
    if (schema.ok) {
      pass('Data API can see the service_categories table');
    } else {
      const body = await schema.json().catch(() => null);
      if (['42P01', 'PGRST205'].includes(body?.code)) {
        fail('service_categories is missing from the Data API schema', 'verify that the migrations are applied to this project and that the public schema is exposed');
      } else if (body?.code === '42501' && [401, 403].includes(schema.status)) {
        info('Anonymous access to service_categories is restricted. Verify schema and data from an authorized account.');
      } else {
        fail(`Data API returned HTTP ${schema.status}`, 'verify that the Data API is enabled and the project configuration is correct');
      }
    }
  }
} catch (e) {
  fail(`Supabase check could not finish (${e.message})`, 'check the project URL, your connection, and Supabase project status');
}

info('Seed data, staff access, and the OAuth round-trip must be verified after signing in.');
console.log(failures === 0 ? '\nBROWSER CONFIGURATION CHECKS PASSED' : `\n${failures} problem(s) to fix. Run pnpm check again after each fix.`);
process.exitCode = failures === 0 ? 0 : 1;
