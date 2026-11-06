// Creates the fictional sample staff accounts with the Supabase admin API and sets their roles.
// Usage:
//   cp .env.example .env.local   # fill VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
//   pnpm --filter herkey-root exec tsx scripts/seed-users.ts     (or: npx tsx scripts/seed-users.ts)
// The service role key is used here only; it never ships to the browser.
// New sign-ups default to Customer via the handle_new_user trigger; this script promotes the
// sample staff listed in glide/data/Staff.csv to their roles. Safe to re-run (idempotent).
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

type StaffRow = {
  Name: string; Email: string; Role: string; HourlyRateCents: string;
};

function csv(text: string): StaffRow[] {
  const lines = text.replace(/^﻿/, '').trim().split(/\r?\n/);
  const head = lines[0].match(/("[^"]*"|[^,]+)/g)!.map((h) => h.replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const cells = line.match(/("[^"]*"|[^,]+)/g)!.map((c) => c.replace(/^"|"$/g, ''));
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ''])) as StaffRow;
  });
}

const staff = csv(readFileSync(join(root, 'glide/data/Staff.csv'), 'utf8'));

for (const person of staff) {
  const email = person.Email.trim().toLowerCase();
  const { data: existing, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;
  const found = existing.users.find((u) => u.email?.toLowerCase() === email);
  if (!found) {
    const { error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: person.Name },
      password: crypto.randomUUID() + '!Aa1', // random throwaway; owners sign in with Google/Apple
    });
    if (error) throw error;
    console.log(`created auth user ${email}`);
  }
  const { data: prof } = await supabase
    .from('profiles').select('id, role').eq('email', email).single();
  if (!prof) { console.error(`no profile for ${email} yet — did the trigger run?`); process.exit(1); }
  const rate = person.HourlyRateCents ? Number(person.HourlyRateCents) : null;
  const { error: updErr } = await supabase
    .from('profiles')
    .update({ role: person.Role, full_name: person.Name, hourly_rate_cents: rate })
    .eq('id', prof.id);
  if (updErr) throw updErr;
  console.log(`role ${email} -> ${person.Role}`);
}
console.log('Done. Sample staff can now sign in with Google or Apple.');
