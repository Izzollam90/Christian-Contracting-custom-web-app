import { useState } from 'react';
import { friendlyError } from '@herkey/shared';
import { Pill, usd, fmtDT, fmtShort, useStepUp } from '@herkey/shared';
import type { StaffData } from '../data';
import { reviewExpense, reviewTime } from '../data';

export default function Approvals({ data, reload, aal2, refreshAal2 }: { data: StaffData; reload: () => Promise<void>; aal2: boolean; refreshAal2: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { requireStepUp, StepUpModal } = useStepUp(aal2, refreshAal2);
  const pendingExpenses = data.expenses.filter((e) => e.status === 'Submitted');
  const flaggedTime = data.time.filter((t) => t.review === 'Needs Review');
  const submitter = (id: string) => data.profiles.find((p) => p.id === id);

  const doExpense = async (id: number, status: 'Approved' | 'Rejected') => {
    setBusy(true); setErr('');
    try { await requireStepUp(async () => { await reviewExpense(id, status); await reload(); }); }
    catch (e) { setErr(friendlyError(e)); }
    finally { setBusy(false); }
  };
  const doTime = async (id: number, review: 'Approved' | 'Rejected') => {
    setBusy(true); setErr('');
    try { await requireStepUp(async () => { await reviewTime(id, review); await reload(); }); }
    catch (e) { setErr(friendlyError(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">Approvals</div>
          <h2>Expenses & flagged time</h2>
          <p>Only approved expenses count in spending reports. Flagged clock-ins are outside the geofence — evidence, not proof.</p>
        </div>
      </div>
      {err && <div className="err" role="alert">{err}</div>}

      <div className="glass pad stack">
        <h3>Expenses awaiting review {pendingExpenses.length > 0 && <span className="badge-count">{pendingExpenses.length}</span>}</h3>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Date</th><th>By</th><th>Category</th><th>Vendor</th><th>Job</th><th className="n">Amount</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {pendingExpenses.map((e) => (
                <tr key={e.id}>
                  <td>{fmtShort(e.expense_date)}</td>
                  <td>{submitter(e.submitted_by)?.full_name ?? '—'}</td>
                  <td>{e.category}</td><td>{e.vendor ?? '—'}</td><td>{e.job_id ?? '—'}</td>
                  <td className="n">{usd(e.amount_cents)}</td><td className="muted">{e.note ?? ''}</td>
                  <td>
                    <div className="row">
                      <button className="btn sm gold" disabled={busy} onClick={() => void doExpense(e.id, 'Approved')}>Approve</button>
                      <button className="btn sm danger" disabled={busy} onClick={() => void doExpense(e.id, 'Rejected')}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!pendingExpenses.length && <tr><td colSpan={8} className="muted">Nothing waiting.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass pad stack">
        <h3>Time entries flagged Needs Review {flaggedTime.length > 0 && <span className="badge-count">{flaggedTime.length}</span>}</h3>
        <div className="tablewrap">
          <table>
            <thead><tr><th>User</th><th>In</th><th>Out</th><th>Job</th><th>Location</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {flaggedTime.map((t) => (
                <tr key={t.id}>
                  <td>{submitter(t.user_id)?.full_name ?? '—'}</td>
                  <td>{fmtDT(t.clock_in)}</td><td>{t.clock_out ? fmtDT(t.clock_out) : '—'}</td>
                  <td>{t.job_id ?? '—'}</td>
                  <td>{t.location_check} {t.distance_meters != null ? `(${t.distance_meters} m)` : ''}</td>
                  <td className="muted">{t.note ?? ''}</td>
                  <td>
                    <div className="row">
                      <button className="btn sm gold" disabled={busy} onClick={() => void doTime(t.id, 'Approved')}>Approve</button>
                      <button className="btn sm danger" disabled={busy} onClick={() => void doTime(t.id, 'Rejected')}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!flaggedTime.length && <tr><td colSpan={7} className="muted">Nothing flagged.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="muted"><Pill status="Needs Review" /> = clocked in outside the 200 m geofence. Approve or reject — the record stays either way.</div>
      {StepUpModal}
    </div>
  );
}
