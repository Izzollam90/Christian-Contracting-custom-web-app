import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { Icon } from './icons';

// Two-factor authentication via Supabase Auth MFA. Allowed factors per owner: TOTP
// (authenticator app) and SMS (phone). No passkeys, no email OTP.
// AAL: after verifying a factor the JWT's aal becomes 'aal2'; money/access actions in the
// database require aal2 (supabase/migrations/0002_mfa_aal2.sql).

interface MfaState {
  aal: 'aal1' | 'aal2';
  factors: { id: string; factorType: string; friendlyName?: string }[];
  pendingFactorId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  // Verify a 6-digit code for the pending factor (sign-in challenge or enrollment).
  verify: (code: string) => Promise<void>;
  challengeId: string | null;
  startChallenge: () => Promise<void>;
}

const MfaCtx = createContext<MfaState | null>(null);
export const useMfa = () => useContext(MfaCtx);

export function MfaProvider({ children }: { children: ReactNode }) {
  const [aal, setAal] = useState<'aal1' | 'aal2'>('aal1');
  const [factors, setFactors] = useState<MfaState['factors']>([]);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: aalData } = await supabase().auth.mfa.getAuthenticatorAssuranceLevel();
      setAal((aalData?.currentLevel ?? 'aal1') as 'aal1' | 'aal2');
      const { data: f } = await supabase().auth.mfa.listFactors();
      setFactors((f?.totp ?? []).map((x) => ({ id: x.id, factorType: 'totp', friendlyName: x.friendly_name }))
        .concat((f?.phone ?? []).map((x) => ({ id: x.id, factorType: 'phone', friendlyName: x.friendly_name ?? (x as { phone?: string }).phone }))));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const startChallenge = useCallback(async () => {
    const { data, error } = await supabase().auth.mfa.challenge({ factorId: pendingFactorId ?? factors[0]?.id ?? '' });
    if (error) throw error;
    setChallengeId(data.id);
  }, [pendingFactorId, factors]);

  const verify = useCallback(async (code: string) => {
    const factorId = pendingFactorId ?? factors[0]?.id;
    if (!factorId) throw new Error('No 2FA factor enrolled');
    let cid = challengeId;
    if (!cid) {
      const { data, error: cerr } = await supabase().auth.mfa.challenge({ factorId });
      if (cerr) throw cerr;
      cid = data.id;
      setChallengeId(cid);
    }
    const { error } = await supabase().auth.mfa.verify({ factorId, challengeId: cid, code });
    if (error) throw error;
    setChallengeId(null);
    await refresh();
  }, [pendingFactorId, factors, challengeId, refresh]);

  const value = useMemo(() => ({ aal, factors, pendingFactorId, loading, refresh, verify, challengeId, startChallenge }),
    [aal, factors, pendingFactorId, loading, refresh, verify, challengeId, startChallenge]);
  return <MfaCtx.Provider value={value}>{children}</MfaCtx.Provider>;
}

// Enroll a new TOTP factor; returns the otpauth:// URI and secret for the authenticator app.
export async function enrollTotp(friendlyName: string) {
  const { data, error } = await supabase().auth.mfa.enroll({ factorType: 'totp', friendlyName });
  if (error) throw error;
  return { factorId: data.id, uri: data.totp.uri as string, secret: data.totp.secret as string };
}

// Enroll an SMS factor; a code is texted to the phone, then verify with it.
export async function enrollPhone(phone: string) {
  const { data, error } = await supabase().auth.mfa.enroll({ factorType: 'phone', phone });
  if (error) throw error;
  return data.id as string;
}

export async function verifyEnrollment(factorId: string, code: string) {
  const { error } = await supabase().auth.mfa.challengeAndVerify({ factorId, code });
  if (error) throw error;
}

export async function unenrollFactor(factorId: string) {
  const { error } = await supabase().auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

// UI: shown when the session is aal1 but the role/action requires aal2.
export function MfaChallenge({ onDone }: { onDone?: () => void }) {
  const mfa = useMfa();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!mfa) return null;
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      if (!mfa.challengeId) await mfa.startChallenge();
      await mfa.verify(code);
      setCode('');
      onDone?.();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  return (
    <div className="glass pad stack" style={{ maxWidth: 420 }}>
      <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="lock" size={20} /> Two-factor authentication</h3>
      <p className="muted" style={{ margin: 0 }}>Enter the 6-digit code from your authenticator app (or the code we texted you).</p>
      <input type="text" inputMode="numeric" maxLength={6} placeholder="123456" value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ maxWidth: 180, fontSize: '1.4rem', letterSpacing: 6, textAlign: 'center' }} />
      {err && <div className="err" role="alert">{err}</div>}
      <div className="row"><button className="btn gold" disabled={busy || code.length !== 6} onClick={() => void submit()}>Verify</button></div>
    </div>
  );
}

// UI: settings panel to enroll/unenroll TOTP and SMS factors.
export function TwoFactorSettings() {
  const mfa = useMfa();
  const [uri, setUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (!mfa) return null;

  const doTotp = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await enrollTotp('Authenticator app');
      setFactorId(r.factorId); setUri(r.uri); setSecret(r.secret);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const doPhone = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const id = await enrollPhone(phone);
      setFactorId(id); setMsg('Code sent by text — enter it below.');
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    if (!factorId) return;
    setBusy(true); setErr('');
    try {
      await verifyEnrollment(factorId, code);
      setMsg('2FA enabled.'); setUri(null); setSecret(null); setFactorId(null); setCode('');
      await mfa.refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    setBusy(true); setErr('');
    try { await unenrollFactor(id); setMsg('Factor removed.'); await mfa.refresh(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="glass pad stack">
      <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="lock" size={20} /> Two-factor authentication</h3>
      <p className="muted" style={{ margin: 0 }}>
        Status: <b style={{ color: mfa.aal === 'aal2' ? 'var(--ok)' : 'var(--warn)' }}>{mfa.aal === 'aal2' ? 'verified this session' : 'not verified this session'}</b>.
        Enrolled factors: {mfa.factors.length ? mfa.factors.map((f) => `${f.factorType === 'totp' ? 'Authenticator app' : 'SMS'} (${f.friendlyName ?? f.id.slice(0, 6)})`).join(', ') : 'none yet'}
      </p>
      {mfa.factors.map((f) => (
        <div className="row" key={f.id}>
          <span>{f.factorType === 'totp' ? 'Authenticator app' : `SMS ${f.friendlyName ?? ''}`}</span>
          <button className="btn sm danger" disabled={busy} onClick={() => void remove(f.id)}>Remove</button>
        </div>
      ))}
      {!uri && !factorId && (
        <div className="row">
          <button className="btn sm" disabled={busy} onClick={() => void doTotp()}>Add authenticator app (TOTP)</button>
          <input type="tel" placeholder="+1 717 555 0100" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ maxWidth: 200 }} />
          <button className="btn sm" disabled={busy || phone.replace(/\D/g, '').length < 10} onClick={() => void doPhone()}>Add SMS</button>
        </div>
      )}
      {uri && (
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>Scan or enter this in your authenticator app:</p>
          <code style={{ wordBreak: 'break-all', fontSize: '.8rem', background: 'rgba(0,0,0,.4)', padding: 10, borderRadius: 8 }}>{uri}</code>
          <p className="muted" style={{ margin: 0 }}>Secret (manual entry): <code>{secret}</code></p>
        </div>
      )}
      {factorId && (
        <div className="row">
          <input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ maxWidth: 140 }} />
          <button className="btn sm gold" disabled={busy || code.length !== 6} onClick={() => void confirm()}>Confirm</button>
        </div>
      )}
      {err && <div className="err" role="alert">{err}</div>}
      {msg && <div style={{ color: 'var(--ok)' }} role="status">{msg}</div>}
    </div>
  );
}

// True when the database rejected an action because the session is aal1 (needs 2FA).
export const isAal2Error = (e: unknown): boolean =>
  e instanceof Error && /two-factor|aal2/i.test(e.message);

// Wrap a money/access action: on an aal2 error, show the code challenge and retry after verify.
export function useStepUp() {
  const [pending, setPending] = useState<(() => Promise<void>) | null>(null);
  const run = async (fn: () => Promise<void>) => {
    try { await fn(); }
    catch (e) {
      if (isAal2Error(e)) setPending(() => fn);
      else throw e;
    }
  };
  const challenge = pending ? (
    <MfaChallenge onDone={() => { const p = pending; setPending(null); void p(); }} />
  ) : null;
  return { run, challenge, needed: !!pending };
}
