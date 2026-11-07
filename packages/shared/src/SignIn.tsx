import { useState } from 'react';
import { friendlyError } from './errors';
import { signInWithOAuth, signInWithPasskey, COMPANY_NAME, GoogleGlyph, Icon } from './index-internal';

type Mode = 'oauth' | 'passkey';

export function SignIn({ subtitle }: { subtitle: string }) {
  const [mode, setMode] = useState<Mode>('oauth');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr(null);
    try { await fn(); }
    catch (e) { setErr(friendlyError(e)); }
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

            {mode === 'oauth' && (
              <div className="stack">
                <button className="oauth-btn" disabled={busy} onClick={() => void run(() => signInWithOAuth())}>
                  <GoogleGlyph /> Continue with Google
                </button>
                <div className="divider">or</div>
                <button className="btn sm" onClick={() => setMode('passkey')}><Icon name="key" size={16} /> Sign in with a passkey</button>
              </div>
            )}

            {mode === 'passkey' && (
              <div className="stack">
                <p className="muted" style={{ margin: 0 }}>Sign in with a passkey — Face ID, Touch ID, or a security key. Works without a password.</p>
                <button className="btn gold" disabled={busy} onClick={() => void run(signInWithPasskey)}><Icon name="key" size={18} /> Sign in with passkey</button>
                <button className="btn ghost" onClick={() => setMode('oauth')}>&larr; All sign-in options</button>
              </div>
            )}

            {err && <div className="err" role="alert">{err}</div>}
          </div>
        </section>
      </main>
    </div>
  );
}
