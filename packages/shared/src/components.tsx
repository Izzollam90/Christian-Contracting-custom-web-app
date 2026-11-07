import { useEffect, useRef, useState, type ReactNode } from 'react';
import { friendlyError } from './errors';
import { STAGES, statusPillClass } from './constants';
import type { JobStatus } from './types';
import { Icon } from './icons';

// Liquid-gold animated background, ported from the approved prototypes (domain-warped value
// noise rendered small, blurred up by CSS). Respects prefers-reduced-motion.
export function LiquidBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const x = c.getContext('2d');
    if (!x) return;
    const W = 120, H = 72;
    c.width = W; c.height = H;
    const img = x.createImageData(W, H);
    const P = new Uint8Array(512);
    {
      const p = [...Array(256).keys()];
      let s = 7;
      for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j] ?? 0, p[i] ?? 0]; }
      for (let i = 0; i < 512; i++) P[i] = p[i & 255] ?? 0;
    }
    const fade = (t: number) => t * t * (3 - 2 * t);
    const h = (i: number, j: number) => (P[P[i & 255]! + (j & 255)]! ?? 0) / 255;
    const noise = (X: number, Y: number) => {
      const i = Math.floor(X), j = Math.floor(Y), fx = X - i, fy = Y - j, u = fade(fx), v = fade(fy);
      const a = h(i, j), b = h(i + 1, j), c2 = h(i, j + 1), d = h(i + 1, j + 1) ?? 0;
      return a + (b - a) * u + (c2 - a) * v + (a - b - c2 + d) * u * v;
    };
    const fbm = (X: number, Y: number) => noise(X, Y) * 0.6 + noise(X * 2.1 + 5.2, Y * 2.1 + 1.3) * 0.3 + noise(X * 4.3 + 9.1, Y * 4.3 + 3.7) * 0.1;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let t = 17, last = 0, raf = 0;
    const frame = (now: number) => {
      if (now - last > 40 || reduce) {
        last = now; t += reduce ? 0 : 0.0042;
        const d = img.data; let k = 0;
        for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
          const nx = (xx / W) * 3.2, ny = (y / H) * 2.0;
          const q = fbm(nx + t * 0.6, ny - t * 0.3);
          const r = fbm(nx + q * 2.4 + t * 0.25, ny + q * 2.1 - t * 0.4);
          const band = 0.5 + 0.5 * Math.sin(r * 15 + t * 2.2);
          const ribbon = Math.pow(band, 5);
          const body = Math.pow(r, 2.2);
          const reveal = Math.min(1, Math.max(0, (xx / W) * 1.25 - 0.1 + (y / H) * 0.25));
          const g = Math.min(1, (ribbon * 0.85 + body * 0.55) * (0.35 + 0.65 * reveal));
          d[k++] = 12 + g * 218 + ribbon * 20 * reveal;
          d[k++] = 13 + g * 165 + ribbon * 10 * reveal;
          d[k++] = 15 + g * 82;
          d[k++] = 255;
        }
        x.putImageData(img, 0, 0);
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <>
      <canvas id="bg" ref={ref} aria-hidden="true" />
      <div className="veil" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
    </>
  );
}

export const Pill = ({ status }: { status: string }) => (
  <span className={`pill ${statusPillClass(status)}`}>{status}</span>
);

export const Spinner = () => <div className="spinner" role="status" aria-label="Loading" />;

export function Toast({ message }: { message: string }) {
  return <div className="toast" role="status">{message}</div>;
}

// 5-stage progress tracker, animated like the prototype.
export function Tracker({ status, jobId }: { status: JobStatus; jobId?: string }) {
  const idx = STAGES.indexOf(status);
  return (
    <div className="track" data-j={jobId} role="img" aria-label={`Progress: ${status}`}>
      <div className="bar" style={{ width: idx <= 0 ? 0 : `${(idx / (STAGES.length - 1)) * 80}%` }} />
      {STAGES.map((s, i) => (
        <div key={s} className={`st ${i < idx ? 'done' : i === idx ? 'now' : ''} ${i === idx && status === 'Completed' ? 'done' : ''}`}>
          <span className="dot">{i < idx || (i === idx && status === 'Completed') ? '✓' : ''}</span>
          {s}
        </div>
      ))}
    </div>
  );
}

export const initials = (name: string | null | undefined): string =>
  (name ?? '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

export function Avatar({ name }: { name: string | null | undefined }) {
  return <span className="avatar">{initials(name)}</span>;
}

export const Empty = ({ children }: { children: ReactNode }) => (
  <div className="glass pad empty">{children}</div>
);

// "Add a passkey to this account" — registers a WebAuthn credential for the signed-in user.
export function PasskeyButton() {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');
  const add = async () => {
    setState('busy'); setErr('');
    try {
      const { registerPasskey } = await import('./auth');
      await registerPasskey();
      setState('done');
    } catch (e) { setErr(friendlyError(e)); setState('idle'); }
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button className="btn ghost sm" title="Add a passkey (Face ID / Touch ID / security key) to this account" onClick={() => void add()}>
        <Icon name="key" size={16} /> {state === 'done' ? 'Passkey added ✓' : 'Add passkey'}
      </button>
      {err && <span className="err">{err}</span>}
    </span>
  );
}

