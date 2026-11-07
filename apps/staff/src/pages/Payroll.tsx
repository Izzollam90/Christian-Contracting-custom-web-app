import { useState } from 'react';
import { friendlyError } from '@herkey/shared';
import { Pill, usd, fmtDT, hoursBetween, useStepUp } from '@herkey/shared';
import type { StaffData } from '../data';
import { reviewTime } from '../data';

const OT_AFTER_H = 40;

export default function Payroll({ data, reload, aal2, refreshAal2 }: { data: StaffData; reload: () => Promise<void>; aal2: boolean; refreshAal2: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { requireStepUp, StepUpModal } = useStepUp(aal2, refreshAal2);
  const user = (id: string) => data.profiles.find((p) => p.id === id);

  const weekOf = (iso: string) => {
    const d = new Date(iso);
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day);
    return d.toISOString().slice(0, 10);
  };
  const rows = data.profiles
    .filter((p) => ['Crew', 'CrewLead'].includes(p.role))
    .map((p) => {
      const entries = data.time.filter((t) => t.user_id === p.id && t.clock_out);
      const byWeek = new Map<string, number>();
      for (const t of entries) {
        const w = weekOf(t.clock_in);
        byWeek.set(w, (byWeek.get(w) ?? 0) + hoursBetween(t.clock_in, t.clock_out));
      }
      const weeks = [...byWeek.entries()].sort().slice(-4);
      const reg = weeks.reduce((a, [, h]) => a + Math.min(h, OT_AFTER_H), 0);
      const ot = weeks.reduce((a, [, h]) => a + Math.max(0, h - OT_AFTER_H), 0);
      const rate = p.hourly_rate_cents ?? 0;
      return { p, weeks, reg, ot, est: Math.round((reg * rate + ot * rate * 1.5) / 100) * 100 };
    });

  const doReview = async (id: number, review: 'Approved' | 'Rejected') => {
    setBusy(true); setErr('');
    try { await requireStepUp(async () => { await reviewTime(id, review); await reload(); }); }
    catch (e) { setErr(friendlyError(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">Time & payroll</div>
          <h2>Hours and estimated labor</h2>
          <p>Overtime at 1.5× after {OT_AFTER_H} h/week. Estimates only — payroll export is not final. Approving time requires 2FA.</p>
        </div>
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      <div className="glass pad stack">
        <h3>Crew hours by week (last 4 weeks)</h3>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Crew</th><th>Rate</th>{[0, 1, 2, 3].map((i) => <th key={i} className="n">{i === 3 ? 'Latest wk' : `${4 - i} wks ago`}</th>)}<th className="n">Reg h</th><th className="n">OT h</th><th className="n">Est. labor</th></tr></thead>
            <tbody>
              {rows.map(({ p, weeks, reg, ot, est }) => (
                <tr key={p.id}>
                  <td>{p.full_name}</td>
                  <td className="n">{p.hourly_rate_cents ? usd(p.hourly_rate_cents) + '/h' : '—'}</td>
                  {[3, 2, 1, 0].map((i) => <td key={i} className="n">{weeks[i] ? weeks[i][1].toFixed(1) : '—'}</td>)}
                  <td className="n">{reg.toFixed(1)}</td>
                  <td className="n">{ot.toFixed(1)}</td>
                  <td className="n">{usd(est)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="glass pad stack">
        <h3>All time entries</h3>
        <div className="tablewrap">
          <table>
            <thead><tr><th>User</th><th>In</th><th>Out</th><th className="n">Hours</th><th>Job</th><th>Location</th><th>Review</th><th></th></tr></thead>
            <tbody>
              {data.time.slice(0, 40).map((t) => (
                <tr key={t.id}>
                  <td>{user(t.user_id)?.full_name ?? '—'}</td>
                  <td>{fmtDT(t.clock_in)}</td>
                  <td>{t.clock_out ? fmtDT(t.clock_out) : '— open —'}</td>
                  <td className="n">{hoursBetween(t.clock_in, t.clock_out).toFixed(2)}</td>
                  <td>{t.job_id ?? '—'}</td>
                  <td>{t.location_check ?? '—'}</td>
                  <td><Pill status={t.review} /></td>
                  <td>{t.review === 'Needs Review' && (
                    <div className="row">
                      <button className="btn sm gold" disabled={busy} onClick={() => void doReview(t.id, 'Approved')}>Approve</button>
                      <button className="btn sm danger" disabled={busy} onClick={() => void doReview(t.id, 'Rejected')}>Reject</button>
                    </div>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {StepUpModal}
    </div>
  );
}
