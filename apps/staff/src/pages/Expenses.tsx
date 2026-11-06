import { useState } from 'react';
import { Pill, usd, fmtShort, useAuth } from '@herkey/shared';
import type { StaffData } from '../data';
import { submitExpense } from '../data';

export default function Expenses({ data, reload }: { data: StaffData; reload: () => Promise<void> }) {
  const { profile } = useAuth();
  const [form, setForm] = useState({ category: 'Materials', vendor: '', amount: '', jobId: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const mine = data.expenses.filter((e) => e.submitted_by === profile?.id)
    .sort((a, b) => +new Date(b.expense_date) - +new Date(a.expense_date));
  const myJobs = data.jobs.filter((j) => j.crew_id === profile?.id);

  const submit = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      await submitExpense({
        jobId: form.jobId || null, category: form.category, vendor: form.vendor,
        amountCents: Math.round(parseFloat(form.amount) * 100), note: form.note,
      });
      setForm({ category: 'Materials', vendor: '', amount: '', jobId: '', note: '' });
      setMsg('Expense submitted for approval.');
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">Expenses</div>
          <h2>My expenses</h2>
          <p>Submitted expenses need Crew Lead, Finance or Admin approval before they count in spending reports.</p>
        </div>
      </div>
      <div className="glass pad stack">
        <h3>Submit an expense</h3>
        <div className="inline-form">
          <label>Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['Materials', 'Fuel', 'Equipment rental', 'Subcontractor', 'Tools', 'Other'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Vendor<input type="text" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Sheetz" /></label>
          <label>Amount ($)<input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="9.50" /></label>
          <label>Job
            <select value={form.jobId} onChange={(e) => setForm({ ...form, jobId: e.target.value })}>
              <option value="">— none —</option>
              {myJobs.map((j) => <option key={j.id} value={j.id}>{j.id} · {j.title}</option>)}
            </select>
          </label>
          <label>Note<input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Truck 2 fill-up" /></label>
          <button className="btn gold" disabled={busy || !form.amount} onClick={() => void submit()}>Submit</button>
        </div>
        {err && <div className="err" role="alert">{err}</div>}
        {msg && <div style={{ color: 'var(--ok)' }} role="status">{msg}</div>}
      </div>
      <div className="glass pad stack">
        <h3>History</h3>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Date</th><th>Category</th><th>Vendor</th><th>Job</th><th className="n">Amount</th><th>Status</th><th>Note</th></tr></thead>
            <tbody>
              {mine.map((e) => (
                <tr key={e.id}>
                  <td>{fmtShort(e.expense_date)}</td><td>{e.category}</td><td>{e.vendor ?? '—'}</td>
                  <td>{e.job_id ?? '—'}</td><td className="n">{usd(e.amount_cents)}</td>
                  <td><Pill status={e.status} /></td><td className="muted">{e.note ?? ''}</td>
                </tr>
              ))}
              {!mine.length && <tr><td colSpan={7} className="muted">No expenses yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
