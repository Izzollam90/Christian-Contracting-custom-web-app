// Local test harness for the Herkey database layer.
// Boots an embedded Postgres (binaries from the @embedded-postgres/linux-x64 package), stubs the
// Supabase-specific pieces (auth schema, auth.uid(), supabase_realtime publication,
// anon/authenticated/service_role roles), applies supabase/migrations/0001_init.sql, creates the
// sample sign-ins, applies supabase/seed.sql, runs supabase/tests/rls_checks.sql, and finally
// proves claim_job is atomic under two simultaneous sessions. Exits non-zero on any failure.
//
// Usage: cd supabase/tests && pnpm install && pnpm test
import { readFileSync, readdirSync, existsSync, createWriteStream, mkdirSync, rmSync, symlinkSync, lstatSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const PORT = 55444;
// The socket dir must be inside the workspace: sandboxed /tmp is per-process and the socket
// would not be visible to the pg client.
const SOCKET_DIR = join(here, '.sock');
const DATABASE = 'herkey_test';
const DATA_DIR = join(here, '.pgdata');

const SAMPLE_USERS = [
  // staff (from glide/data/Staff.csv) — roles set after insert
  { email: 'marcus.lee@example.com', name: 'Marcus Lee', role: 'Crew', rate: 2800 },
  { email: 'tasha.green@example.com', name: 'Tasha Green', role: 'Crew', rate: 3100 },
  { email: 'eli.ortiz@example.com', name: 'Eli Ortiz', role: 'Crew', rate: 2600 },
  { email: 'renee.carter@example.com', name: 'Renee Carter', role: 'CrewLead', rate: 3400 },
  { email: 'pat.kim@example.com', name: 'Pat Kim', role: 'Finance', rate: null },
  { email: 'owner@example.com', name: 'Owner', role: 'Admin', rate: null },
  // sample customers (from glide/data/Customers.csv) — linked by email on first insert
  { email: 'dana.whitfield@example.com', name: 'Dana Whitfield', role: 'Customer', rate: null },
  { email: 'robert.ames@example.com', name: 'Robert Ames', role: 'Customer', rate: null },
  { email: 'greenfield.pm@example.com', name: 'Greenfield Property Group', role: 'Customer', rate: null },
  { email: 'linda.moss@example.com', name: 'Linda Moss', role: 'Customer', rate: null },
];

let failures = 0;
const ok = (msg) => console.log(`  PASS  ${msg}`);
const bad = (msg) => { failures++; console.error(`  FAIL  ${msg}`); };

// Locate the bundled postgres binaries (works with both npm's flat and pnpm's symlinked layout).
function findNative() {
  const nm = join(here, 'node_modules');
  const roots = [join(nm, '@embedded-postgres/linux-x64/native')];
  const pnpmDir = join(nm, '.pnpm');
  if (existsSync(pnpmDir)) {
    for (const d of readdirSync(pnpmDir)) {
      if (d.startsWith('@embedded-postgres+linux-x64')) {
        roots.push(join(pnpmDir, d, 'node_modules/@embedded-postgres/linux-x64/native'));
      }
    }
  }
  for (const r of roots) if (existsSync(join(r, 'bin/postgres'))) return r;
  throw new Error('Could not locate @embedded-postgres/linux-x64 binaries; run pnpm install first.');
}

// pnpm drops the .so.X version symlinks when it reinstalls the binary package; recreate them.
function repairLibSymlinks(lib) {
  for (const f of readdirSync(lib)) {
    if (!f.includes('.so.')) continue;
    const parts = f.split('.');
    if (parts.length < 4) continue; // need *.so.X.Y
    const mid = parts.slice(0, -1).join('.');
    const base = parts.slice(0, -2).join('.');
    for (const link of [join(lib, mid), join(lib, base)]) {
      try { lstatSync(link); } catch { try { symlinkSync(f, link); } catch { /* exists */ } }
    }
  }
}

function run(bin, args, log) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { env: { ...process.env, LC_MESSAGES: 'en_US.UTF-8' } });
    let out = '';
    p.stdout.on('data', (d) => { out += d; if (log) process.stdout.write(d); });
    p.stderr.on('data', (d) => { out += d; if (log) process.stderr.write(d); });
    p.on('exit', (code) => (code === 0 ? resolve(out) : reject(new Error(`${bin} exited ${code}: ${out.slice(-400)}`))));
  });
}

async function waitReady(client) {
  for (let i = 0; i < 120; i++) {
    try { await client.query('select 1'); return; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  throw new Error('postgres did not become ready');
}

async function main() {
  const native = findNative();
  const bin = join(native, 'bin');
  const lib = join(native, 'lib');
  repairLibSymlinks(lib);
  process.env.LD_LIBRARY_PATH = `${lib}${process.env.LD_LIBRARY_PATH ? ':' + process.env.LD_LIBRARY_PATH : ''}`;

  console.log('Initializing embedded Postgres cluster...');
  rmSync(DATA_DIR, { recursive: true, force: true });
  rmSync(SOCKET_DIR, { recursive: true, force: true });
  mkdirSync(SOCKET_DIR, { recursive: true });
  await run(join(bin, 'initdb'), ['-D', DATA_DIR, '-U', 'postgres', '--auth=trust', '-E', 'UTF8'], false);
  const serverLog = createWriteStream(join(here, 'postgres.log'));
  const server = spawn(join(bin, 'postgres'),
    ['-D', DATA_DIR, '-k', SOCKET_DIR, '-p', String(PORT), '-c', 'listen_addresses='], {});
  server.stdout.on('data', (d) => serverLog.write(d));
  server.stderr.on('data', (d) => serverLog.write(d));
  const connect = (db = 'postgres') => new pg.Client({
    host: SOCKET_DIR, port: PORT, user: 'postgres', database: db,
  });
  let probe = null;
  for (let i = 0; i < 120; i++) {
    try { probe = connect(); await probe.connect(); break; }
    catch { probe = null; if (i === 119) throw new Error('postgres did not come up'); await new Promise((r) => setTimeout(r, 500)); }
  }
  await waitReady(probe);
  console.log('Postgres is up.');

  await probe.query(`drop database if exists ${DATABASE}`);
  await probe.query(`create database ${DATABASE}`);
  await probe.end();

  const db = connect(DATABASE);
  await db.connect();

  console.log('Stubbing Supabase primitives...');
  await db.query(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key default gen_random_uuid(),
      email text unique,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    -- Mirrors Supabase: auth.uid() reads the "sub" claim of request.jwt.claims.
    create or replace function auth.uid() returns uuid language sql stable as $f$
      select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
    $f$;
    -- Mirrors Supabase: auth.jwt() returns the full claims object (incl. "aal" for MFA level).
    create or replace function auth.jwt() returns jsonb language sql stable as $f$
      select nullif(current_setting('request.jwt.claims', true), '')::jsonb
    $f$;
    grant usage on schema auth to anon, authenticated, service_role;
    do $p$
    begin
      if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        create publication supabase_realtime;
      end if;
    end $p$;
  `);

  console.log('Applying supabase/migrations/0001_init.sql...');
  await db.query(readFileSync(join(root, 'supabase/migrations/0001_init.sql'), 'utf8'));
  ok('migration 0001 applied');
  console.log('Applying supabase/migrations/0002_mfa_aal2.sql...');
  await db.query(readFileSync(join(root, 'supabase/migrations/0002_mfa_aal2.sql'), 'utf8'));
  ok('migration 0002 applied');

  // Supabase grants table access to the authenticated role by default and lets RLS filter rows;
  // replicate that here. anon gets schema usage only, no table access.
  await db.query(`
    grant usage on schema public to anon, authenticated, service_role;
    grant all on all tables in schema public to authenticated, service_role;
    grant usage on all sequences in schema public to authenticated, service_role;
  `);

  console.log('Creating sample sign-ins (trigger links customers by email)...');
  for (const u of SAMPLE_USERS) {
    await db.query(
      `insert into auth.users (email, raw_user_meta_data) values ($1, $2)`,
      [u.email, JSON.stringify({ full_name: u.name })]
    );
  }
  for (const u of SAMPLE_USERS.filter((u) => u.role !== 'Customer')) {
    await db.query(
      `update profiles set role = $1, hourly_rate_cents = $2 where email = $3`,
      [u.role, u.rate, u.email]
    );
  }
  ok('sample users + roles created');

  console.log('Applying supabase/seed.sql...');
  await db.query(readFileSync(join(root, 'supabase/seed.sql'), 'utf8'));
  ok('seed applied');

  console.log('Running supabase/tests/rls_checks.sql...');
  const checks = readFileSync(join(here, 'rls_checks.sql'), 'utf8');
  const notices = [];
  db.on('notice', (n) => notices.push(n.message));
  try {
    await db.query(checks);
  } catch (err) {
    bad(`rls_checks.sql raised: ${err.message}`);
  }
  const passed = notices.filter((m) => m.startsWith('PASS')).length;
  const failed = notices.filter((m) => m.startsWith('FAIL')).length;
  for (const n of notices) console.log(`  ${n}`);
  console.log(`  -> ${passed} passed, ${failed} failed`);
  if (failed > 0) failures += failed;
  db.removeAllListeners('notice');

  console.log('Concurrency proof: two simultaneous claim_job calls...');
  const asUser = async (client, email) => {
    const { rows } = await client.query(`select id from profiles where email = $1`, [email]);
    await client.query(`set role authenticated`);
    await client.query(`set request.jwt.claims = '${JSON.stringify({ sub: rows[0].id })}'`);
  };
  const c1 = connect(DATABASE); await c1.connect();
  const c2 = connect(DATABASE); await c2.connect();
  const ROUNDS = 12;
  let doubleClaims = 0;
  for (let i = 0; i < ROUNDS; i++) {
    await db.query(
      `insert into jobs (title, category, customer_id, service_address) values ($1, 'Plumbing', 'C-01', '410 Maple Ridge Rd, Apt 204, Lancaster, PA 17601')`,
      [`Race test job ${i}`]
    );
    const { rows } = await db.query(`select id from jobs where title = $1 order by created_at desc limit 1`, [`Race test job ${i}`]);
    const jobId = rows[0].id;
    await asUser(c1, 'marcus.lee@example.com');
    await asUser(c2, 'tasha.green@example.com');
    const attempt = (client) => client.query(`select claim_job($1)`, [jobId]).then(() => true).catch(() => false);
    const [a, b] = await Promise.all([attempt(c1), attempt(c2)]);
    if (a && b) doubleClaims++;
    const { rows: w } = await db.query(`select crew_id from jobs where id = $1`, [jobId]);
    if (!w[0].crew_id) bad(`round ${i}: job ${jobId} ended unclaimed`);
  }
  await c1.end(); await c2.end();
  if (doubleClaims === 0) ok(`no double claims in ${ROUNDS} simultaneous race rounds`);
  else bad(`${doubleClaims}/${ROUNDS} rounds had both claims succeed`);

  await db.end();
  server.kill('SIGINT');
  console.log(failures === 0 ? '\nALL DATABASE TESTS PASSED' : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
