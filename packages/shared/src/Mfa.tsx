import { useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  supabase, isAal2, enrollMfaFactor, createMfaChallenge, verifyMfaChallenge,
  unenrollMfaFactor, listMfaFactors, registerPasskey, Icon,
} from './index-internal';

// ============ useAal2 hook: tracks whether the session is aal2 ============
export function useAal2() {
  const [aal2, setAal2] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await isAal2();
    setAal2(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase().auth.onAuthStateChange(() => { void refresh(); });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return { aal2, loading, refresh };
}

// ============ Step-up modal: prompts for a TOTP code to reach aal2 ============
export function StepUpPrompt({ onClose, onVerified }: { onClose: () => void; onVerified: () => void }) {
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingFactors, setLoadingFactors] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await listMfaFactors();
        const verified = data.totp.filter((f) => f.status === 'verified');
        if (verified.length === 0) { setErr('No verified 2FA factor found. Set up two-factor authentication first.'); setLoadingFactors(false); return; }
        const fid = verified[0]!.id;
        setFactorId(fid);
        const ch = await createMfaChallenge(fid);
        setChallengeId(ch.id);
      } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
      finally { setLoadingFactors(false); }
    })();
  }, []);

  const verify = async () => {
    setBusy(true); setErr('');
    try {
      await verifyMfaChallenge(factorId, challengeId, code);
      onVerified();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="glass pad stack" style={{ maxWidth: 380, margin: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}><Icon name="shield" size={20} /> Enter your code</h3>
          <button className="btn ghost sm" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: '.9rem' }}>Enter the 6-digit code from your authenticator app to continue.</p>
        {err && <div className="err" role="alert">{err}</div>}
        {loadingFactors ? <div className="spinner" /> : factorId && (
          <input
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000" style={{ fontSize: '1.5rem', letterSpacing: '0.3em', textAlign: 'center' }}
            autoFocus onKeyDown={(e) => { if (e.key === 'Enter') void verify(); }}
          />
        )}
        <button className="btn gold" disabled={busy || code.length !== 6 || !factorId} onClick={() => void verify()}>Verify</button>
      </div>
    </div>
  );
}

// ============ useStepUp: wraps a money/access action with aal2 check ============
export function useStepUp(aal2: boolean, refreshAal2: () => Promise<void>) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const requireStepUp = useCallback(async (action: () => Promise<void>) => {
    if (aal2) { await action(); return; }
    setPendingAction(() => action);
    setShowPrompt(true);
  }, [aal2]);

  const onVerified = useCallback(async () => {
    setShowPrompt(false);
    await refreshAal2();
    if (pendingAction) { await pendingAction(); setPendingAction(null); }
  }, [pendingAction, refreshAal2]);

  const StepUpModal = showPrompt ? <StepUpPrompt onClose={() => setShowPrompt(false)} onVerified={() => void onVerified()} /> : null;
  return { requireStepUp, StepUpModal };
}

// ============ MFA enrollment card: QR + manual key + verify ============
interface TotpEnrollData { qr_code: string; secret: string; uri: string }

export function MfaEnrollCard({ onDone }: { onDone: () => void }) {
  const [factor, setFactor] = useState<TotpEnrollData | null>(null);
  const [factorId, setFactorId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'name' | 'qr' | 'verify' | 'done'>('name');

  const startEnroll = async () => {
    setBusy(true); setErr('');
    try {
      const data = await enrollMfaFactor(name || 'Authenticator');
      if (data.totp) {
        setFactor({ qr_code: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri });
        setFactorId(data.id);
        setStep('qr');
      }
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true); setErr('');
    try {
      const ch = await createMfaChallenge(factorId);
      await verifyMfaChallenge(factorId, ch.id, code);
      setStep('done');
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  if (step === 'done') {
    return (
      <div className="glass pad stack">
        <h3 style={{ margin: 0 }}><Icon name="check" size={20} /> Two-factor enabled</h3>
        <p className="muted" style={{ margin: 0 }}>Your authenticator app is now set up. You'll enter a code for money and access actions.</p>
        <button className="btn" onClick={onDone}>Done</button>
      </div>
    );
  }

  return (
    <div className="glass pad stack">
      <h3 style={{ margin: 0 }}><Icon name="shield" size={20} /> Set up two-factor authentication</h3>
      <p className="muted" style={{ margin: 0, fontSize: '.9rem' }}>Scan the QR code with an authenticator app (Google Authenticator, 1Password, etc.), then enter the 6-digit code to confirm.</p>
      {err && <div className="err" role="alert">{err}</div>}
      {step === 'name' && (
        <>
          <label className="f">Friendly name (optional)<input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Work phone" /></label>
          <button className="btn gold" disabled={busy} onClick={() => void startEnroll()}>Get QR code</button>
        </>
      )}
      {step === 'qr' && factor && (
        <>
          <div style={{ background: '#fff', padding: 12, borderRadius: 8, alignSelf: 'center' }}>
            <img src={factor.qr_code} alt="QR code for authenticator app" width={200} height={200} />
          </div>
          <details><summary className="muted" style={{ cursor: 'pointer', fontSize: '.85rem' }}>Can't scan? Enter this key manually</summary>
            <code style={{ fontSize: '.8rem', wordBreak: 'break-all' }}>{factor.secret}</code>
          </details>
          <button className="btn" onClick={() => setStep('verify')}>I've scanned it</button>
        </>
      )}
      {step === 'verify' && (
        <>
          <p className="muted" style={{ margin: 0 }}>Enter the 6-digit code from your app:</p>
          <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000" style={{ fontSize: '1.5rem', letterSpacing: '0.3em', textAlign: 'center' }}
            autoFocus onKeyDown={(e) => { if (e.key === 'Enter') void verify(); }} />
          <button className="btn gold" disabled={busy || code.length !== 6} onClick={() => void verify()}>Confirm</button>
        </>
      )}
    </div>
  );
}

// ============ Security page: lists MFA factors + passkeys with add/remove ============
export function SecurityPage({ aal2, refreshAal2 }: { aal2: boolean; refreshAal2: () => Promise<void> }) {
  const [factors, setFactors] = useState<{ id: string; friendly_name: string | null; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);
  const [err, setErr] = useState('');
  const [passkeyMsg, setPasskeyMsg] = useState('');

  const load = async () => {
    try {
      const data = await listMfaFactors();
      setFactors(data.totp.map((f) => ({ id: f.id, friendly_name: f.friendly_name ?? null, status: f.status })));
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const removeFactor = async (id: string) => {
    setErr('');
    try { await unenrollMfaFactor(id); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  const addPasskey = async () => {
    setPasskeyMsg(''); setErr('');
    try { await registerPasskey(); setPasskeyMsg('Passkey added.'); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">Security</div>
          <h2>Two-factor & passkeys</h2>
          <p className="muted">Admin and Finance must use 2FA to access the app. Everyone needs it for money and access actions.</p>
        </div>
      </div>
      {err && <div className="err" role="alert">{err}</div>}

      <div className="glass pad stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Two-factor (TOTP)</h3>
          <span className="muted" style={{ fontSize: '.85rem' }}>{aal2 ? 'Verified this session' : 'Not verified this session'}</span>
        </div>
        {loading ? <div className="spinner" /> : (
          factors.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>No factors yet. Add one below.</p>
          ) : (
            <div className="tablewrap">
              <table>
                <thead><tr><th>Name</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {factors.map((f) => (
                    <tr key={f.id}>
                      <td>{f.friendly_name ?? 'Authenticator'}</td>
                      <td><span className={`pill ${f.status === 'verified' ? 'p-ok' : 'p-muted'}`}>{f.status}</span></td>
                      <td><button className="btn sm danger" onClick={() => void removeFactor(f.id)}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {showEnroll ? (
          <MfaEnrollCard onDone={() => { void load(); void refreshAal2(); setShowEnroll(false); }} />
        ) : (
          <button className="btn gold" onClick={() => setShowEnroll(true)}><Icon name="plus" size={16} /> Add a factor</button>
        )}
      </div>

      <div className="glass pad stack">
        <h3 style={{ margin: 0 }}>Passkeys</h3>
        <p className="muted" style={{ margin: 0, fontSize: '.9rem' }}>Passkeys let you sign in with Face ID, Touch ID, or a security key — no password needed.</p>
        <div className="row">
          <button className="btn gold" onClick={() => void addPasskey()}><Icon name="key" size={16} /> Add a passkey</button>
          {passkeyMsg && <span style={{ color: 'var(--ok)' }}>{passkeyMsg}</span>}
        </div>
      </div>
    </div>
  );
}

// ============ Passkey enrollment nudge: shown after first Google sign-in ============
export function PasskeyNudge({ onDismiss }: { onDismiss: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const add = async () => {
    setBusy(true); setErr('');
    try { await registerPasskey(); setDone(true); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="glass pad stack">
        <h3 style={{ margin: 0 }}><Icon name="check" size={20} /> Passkey added</h3>
        <p className="muted" style={{ margin: 0 }}>Next time you can sign in with Face ID, Touch ID, or your security key.</p>
        <button className="btn" onClick={onDismiss}>Got it</button>
      </div>
    );
  }

  return (
    <div className="glass pad stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}><Icon name="key" size={20} /> Sign in faster next time</h3>
        <button className="btn ghost sm" onClick={onDismiss} aria-label="Dismiss"><Icon name="x" size={16} /></button>
      </div>
      <p className="muted" style={{ margin: 0 }}>Add a passkey to this account so you can sign in with Face ID, Touch ID, or a security key — no password needed.</p>
      {err && <div className="err" role="alert">{err}</div>}
      <div className="row">
        <button className="btn gold" disabled={busy} onClick={() => void add()}><Icon name="key" size={16} /> Add a passkey</button>
        <button className="btn ghost" onClick={onDismiss}>Maybe later</button>
      </div>
    </div>
  );
}

// ============ Admin/Finance gate: blocks all screens until aal2 ============
export function Aal2Gate({ children, aal2, loading }: { children: ReactNode; aal2: boolean; loading: boolean }) {
  if (loading) return <div className="spinner" />;
  if (!aal2) {
    return (
      <div className="glass pad stack" style={{ maxWidth: 420, margin: '20vh auto 0' }}>
        <h3 style={{ margin: 0 }}><Icon name="shield" size={20} /> Two-factor required</h3>
        <p className="muted" style={{ margin: 0 }}>Your role requires two-factor authentication. Set it up or enter your code to continue.</p>
        <MfaEnrollCard onDone={() => window.location.reload()} />
      </div>
    );
  }
  return <>{children}</>;
}
