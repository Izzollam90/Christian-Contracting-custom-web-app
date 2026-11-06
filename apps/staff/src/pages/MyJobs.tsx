import { useState } from 'react';
import { Pill, Icon, categoryIcon, fmtDay, fmtDT, useAuth } from '@herkey/shared';
import type { StaffData } from '../data';
import type { JobStatus } from '@herkey/shared';
import { setJobStatus, addActivity, submitExpense } from '../data';

const CREW_STATUSES: JobStatus[] = ['In Progress', 'On Hold', 'Completed'];

export default function MyJobs({ data, reload }: { data: StaffData; reload: () => Promise<void> }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [exp, setExp] = useState({ category: 'Materials', vendor: '', amount: '', note: '' });

  const mine = data.jobs.filter((j) => j.crew_id === profile?.id);
  const job = mine.find((j) => j.id === open);
  const jobLog = job ? data.activity.filter((a) => a.job_id === job.id) : [];
  const jobCustomer = job ? data.customers.find((c) => c.id === job.customer_id) : null;

  const changeStatus = async (j: typeof job, status: JobStatus) => {
    if (!j) return;
    setBusy(true); setErr('');
    try {
      await setJobStatus(j.id, status, note || undefined);
      if (note) { await addActivity(j.id, `Note: ${note}`); setNote(''); }
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const addExpense = async () => {
    if (!job || !exp.amount) return;
    setBusy(true); setErr('');
    try {
      await submitExpense({
        jobId: job.id, category: exp.category, vendor: exp.vendor,
        amountCents: Math.round(parseFloat(exp.amount) * 100), note: exp.note,
      });
      setExp({ category: 'Materials', vendor: '', amount: '', note: '' });
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">My jobs</div>
          <h2>Assigned to you</h2>
        </div>
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      <div className="glass list">
        {mine.length ? mine.map((j) => (
          <button key={j.id} type="button" className="jr" onClick={() => setOpen(open === j.id ? null : j.id)}>
            <span className="ic"><Icon name={categoryIcon(j.category)} size={22} /></span>
            <span>
              <span className="t">{j.title}</span>
              <span className="s"><span className="mono">{j.id}</span> · {j.service_address} · {j.preferred_date ? `${fmtDay(j.preferred_date)}${j.time_slot ? `, ${j.time_slot}` : ''}` : 'not scheduled'}</span>
            </span>
            <span className="e"><Pill status={j.status} /></span>
          </button>
        )) : <div className="empty">No jobs assigned. Claim one from the Job board.</div>}
      </div>

      {job && (
        <div className="glass pad stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="jobid">{job.id} · {job.category.toUpperCase()}</div>
              <h3>{job.title}</h3>
            </div>
            <Pill status={job.status} />
          </div>
          {jobCustomer && (
            <dl className="kv">
              <dt>Customer</dt><dd>{jobCustomer.name} · {jobCustomer.phone ?? '—'}</dd>
              <dt>Address</dt><dd>{job.service_address}</dd>
              <dt>Details</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{job.description || '—'}</dd>
            </dl>
          )}
          <div className="row">
            {CREW_STATUSES.map((s) => (
              <button key={s} className="btn sm" disabled={busy || job.status === s} onClick={() => void changeStatus(job, s)}>{s}</button>
            ))}
          </div>
          <div className="row">
            <input type="text" placeholder="Add a note (goes to the activity log)" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
          </div>
          <div className="stack" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <h3>Submit an expense for this job</h3>
            <div className="inline-form">
              <label>Category
                <select value={exp.category} onChange={(e) => setExp({ ...exp, category: e.target.value })}>
                  {['Materials', 'Fuel', 'Equipment rental', 'Subcontractor', 'Tools', 'Other'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label>Vendor<input type="text" value={exp.vendor} onChange={(e) => setExp({ ...exp, vendor: e.target.value })} placeholder="Ace Supply" /></label>
              <label>Amount ($)<input type="number" min="0" step="0.01" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} placeholder="18.00" /></label>
              <label>Note<input type="text" value={exp.note} onChange={(e) => setExp({ ...exp, note: e.target.value })} placeholder="P-trap kit" /></label>
              <button className="btn gold" disabled={busy || !exp.amount} onClick={() => void addExpense()}>Submit expense</button>
            </div>
          </div>
          <div className="stack">
            <h3>Activity</h3>
            <ul className="tl">{jobLog.map((l) => <li key={l.id}><div>{l.action}<small>{fmtDT(l.at)}</small></div></li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}
