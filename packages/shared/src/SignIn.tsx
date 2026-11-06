import { useState } from 'react';
import {
  signInWithOAuth, signInWithMagicLink, signInWithPassword, signUpWithPassword,
  signInWithPasskey, COMPANY_NAME,
  GoogleGlyph, AppleGlyph, FacebookGlyph, XGlyph, Icon,
} from './index-internal';

type Mode = 'oauth' | 'password' | 'magic' | 'signup' | 'passkey';

export function SignIn({ subtitle }: { subtitle: string }) {
  const [mode, setMode] = useState<Mode>('oauth');
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
            <p className="muted" style={{ margin: 0 }}>Use any of these — your account is the same no matter which you pick.</p>

            {mode === 'oauth' && (
              <div className="stack">
                <button className="oauth-btn" disabled={busy} onClick={() => void run(() => signInWithOAuth('google'))}><GoogleGlyph /> Continue with Google</button>
                <button className="oauth-btn" disabled={busy} onClick={() => void run(() => signInWithOAuth('apple'))}><AppleGlyph /> Continue with Apple</button>
                <button className="oauth-btn" disabled={busy} onClick={() => void run(() => signInWithOAuth('facebook'))}><FacebookGlyph /> Continue with Facebook</button>
                <button className="oauth-btn" disabled={busy} onClick={() => void run(() => signInWithOAuth('twitter'))}><XGlyph /> Continue with X</button>
                <div className="divider">or</div>
                <div className="row">
                  <button className="btn sm" onClick={() => setMode('passkey')}><Icon name="key" size={16} /> Passkey</button>
                  <button className="btn sm" onClick={() => setMode('password')}>Password</button>
                  <button className="btn sm" onClick={() => setMode('magic')}>Email link</button>
                </div>
              </div>
            )}

            {mode === 'passkey' && (
              <div className="stack">
                <p className="muted" style={{ margin: 0 }}>Sign in with a passkey — Face ID, Touch ID, or a security key. Works without a password.</p>
                <button className="btn gold" disabled={busy} onClick={() => void run(signInWithPasskey)}><Icon name="key" size={18} /> Sign in with passkey</button>
                <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>New here? Create an account with password or an email link first, then add a passkey from the account menu (key icon) — after that you can drop the password.</p>
                <button className="btn ghost" onClick={() => setMode('oauth')}>← All sign-in options</button>
              </div>
            )}

            {mode === 'password' && (
              <div className="stack">
                <label className="f">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
                <label className="f">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label>
                <button className="btn gold" disabled={busy || !email || !password} onClick={() => void run(() => signInWithPassword(email, password))}>Sign in</button>
                <button className="btn ghost" onClick={() => setMode('signup')}>Create an account with password</button>
                <button className="btn ghost" onClick={() => setMode('oauth')}>← All sign-in options</button>
              </div>
            )}

            {mode === 'signup' && (
              <div className="stack">
                <label className="f">Full name<input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>
                <label className="f">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
                <label className="f">Password (min 8 characters)<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label>
                <button className="btn gold" disabled={busy || !email || password.length < 8 || !name} onClick={() => void run(() => signUpWithPassword(email, password, name), 'Check your email to confirm, then sign in.')}>Create account</button>
                <button className="btn ghost" onClick={() => setMode('oauth')}>← All sign-in options</button>
              </div>
            )}

            {mode === 'magic' && (
              <div className="stack">
                <label className="f">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
                <button className="btn gold" disabled={busy || !email} onClick={() => void run(() => signInWithMagicLink(email), 'Magic link sent — check your email.')}>Email me a sign-in link</button>
                <button className="btn ghost" onClick={() => setMode('oauth')}>← All sign-in options</button>
              </div>
            )}

            {err && <div className="err" role="alert">{err}</div>}
            {msg && <div style={{ color: 'var(--ok)' }} role="status">{msg}</div>}
          </div>
        </section>
      </main>
    </div>
  );
}
