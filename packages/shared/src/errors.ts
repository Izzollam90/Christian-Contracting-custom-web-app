// Turns anything thrown by supabase-js / PostgREST / Postgres into something safe to show.
//
// The app's own rules raise deliberate, user-facing messages from RPCs and triggers
// ("Two-factor authentication required to create invoices", "Only an Admin can change
// role..."). Those must keep reaching the screen. Everything else — constraint names,
// table names, policy text, SQLSTATE detail, network internals — is implementation
// detail that tells an attacker how the database is built, so it is replaced.

const GENERIC = "Sorry, that didn't work. Please try again, or contact the office if it keeps happening.";
const GENERIC_DENIED = "You don't have permission to do that.";
const GENERIC_CONFLICT = 'Someone else just changed this. Refresh and try again.';
const GENERIC_OFFLINE = "Can't reach the server. Check your connection and try again.";

// Messages the application itself raises (every `raise exception` in supabase/migrations,
// plus the ones the UI throws). Anything matching is shown verbatim.
const APP_MESSAGES = new Set(
  [
    'A time entry cannot be reassigned to another person',
    'Cannot reset your own MFA — ask another Admin or use the dashboard',
    'Estimate must be Accepted',
    'Estimate not found or already answered',
    'Job already claimed or not open',
    'Not allowed to claim jobs',
    'Not allowed',
    'Not your job',
    'Only a lead, Finance or an Admin can change a clock-in time',
    'Only a lead, Finance or an Admin can review time entries',
    'Only an Admin can change role, rate, active status or customer link',
    'Only an Admin can reset MFA',
    'Status not allowed',
    'This job can no longer be canceled online',
    'Two-factor authentication required to accept an estimate',
    'Two-factor authentication required to change roles, rates or access',
    'Two-factor authentication required to create invoices',
    'Two-factor authentication required to reset MFA',
    'Two-factor authentication required to review time entries',
    'Enter the 6-digit code from your authenticator app.',
    'This device does not support passkeys.',
  ].map((s) => s.toLowerCase()),
);

const APP_MESSAGES_BY_LENGTH = [...APP_MESSAGES].sort((a, b) => b.length - a.length);

// Shapes that mean "the database refused you", which we answer generically.
const DENIED = /(row-level security|permission denied|insufficient privilege|not authorized|violates row-level)/i;
const CONFLICT = /(duplicate key|unique constraint|already (claimed|taken|exists)|conflict)/i;
const OFFLINE = /(failed to fetch|network ?error|load failed|timeout|ECONNREFUSED)/i;

function messageOf(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object') {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return '';
}

export function friendlyError(e: unknown): string {
  const raw = messageOf(e).trim();
  if (!raw) return GENERIC;
  if (APP_MESSAGES.has(raw.toLowerCase())) return raw;
  // Postgres prefixes RPC/trigger errors when they travel through PostgREST; recover
  // the known message and drop the surrounding internal detail. Longest match wins.
  const lower = raw.toLowerCase();
  for (const m of APP_MESSAGES_BY_LENGTH) {
    const at = lower.indexOf(m);
    if (at !== -1) return raw.slice(at, at + m.length);
  }
  if (OFFLINE.test(raw)) return GENERIC_OFFLINE;
  if (DENIED.test(raw)) return GENERIC_DENIED;
  if (CONFLICT.test(raw)) return GENERIC_CONFLICT;
  return GENERIC;
}
