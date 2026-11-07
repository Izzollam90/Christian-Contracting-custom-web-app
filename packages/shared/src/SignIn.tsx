import { useState } from 'react';
import {
  signInWithGoogle, signInWithPassword, signUpWithPassword, COMPANY_NAME, GoogleGlyph, Icon,
} from './index-internal';

type Mode = 'main' | 'password' | 'signup';

// Sign-in: Google or email+password only (owner spec, product branch).
export function SignIn({ subtitle }: { subtitle: string }) {
  const [mode, setMode] = useState<Mode>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>, okMsg?: string) => {
    setBusy(true); setErr(null); setMsg(null);
    try { await fn(); if (okMsg) setMsg(okMsg); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="app">
      <main className="wrap">
        <section className="signin">
          <div className="glass pad stack">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="mono">HM</span>
              <div className="wordmark"><b>{COMPANY_NAME}</b><small>{subtitle}</small></div>
            </div>
            <h2 style={{ fontSize: '1.6rem' }}>Sign in</h2>

            {mode === 'main' && (
              <div className="stack">
                <button className="oauth-btn" disabled={busy} onClick={() => void run(signInWithGoogle)}><GoogleGlyph /> Continue with Google</button>
                <div className="divider">or</div>
                <button className="btn" disabled={busy} onClick={() => setMode('password')}>Sign in with email & password</button>
                <button className="btn ghost" disabled={busy} onClick={() => setMode('signup')}>Create an account</button>
              </div>
            )}

            {mode === 'password' && (
              <div className="stack">
                <label className="f">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
                <label className="f">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" /></label>
                <button className="btn gold" disabled={busy || !email || !password} onClick={() => void run(() => signInWithPassword(email, password))}>Sign in</button>
                <button className="btn ghost" onClick={() => setMode('main')}>← Back</button>
              </div>
            )}

            {mode === 'signup' && (
              <div className="stack">
                <label className="f">Full name<input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>
                <label className="f">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
                <label className="f">Password (min 12 characters)<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" /></label>
                <button className="btn gold" disabled={busy || !email || password.length < 12 || !name} onClick={() => void run(() => signUpWithPassword(email, password, name), 'Check your email to confirm, then sign in.')}>Create account</button>
                <button className="btn ghost" onClick={() => setMode('main')}>← Back</button>
              </div>
            )}

            {err && <div className="err" role="alert">{err}</div>}
            {msg && <div style={{ color: 'var(--ok)' }} role="status">{msg}</div>}
            <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>After sign-in you can add two-factor authentication (authenticator app or SMS) from your account menu.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
