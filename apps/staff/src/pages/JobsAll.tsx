import { useState } from 'react';
import { friendlyError } from '@herkey/shared';
import { Pill, Icon, categoryIcon, fmtDay, fmtDT, ALL_STATUSES, useAuth } from '@herkey/shared';
import type { StaffData } from '../data';
import { setJobStatus, addActivity } from '../data';

const FILTERS = ['Open', 'Unclaimed', ...ALL_STATUSES, 'All'] as const;

export default function JobsAll({ data, reload }: { data: StaffData; reload: () => Promise<void> }) {
  const { profile } = useAuth();
  const [f, setF] = useState<(typeof FILTERS)[number]>('Open');
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const canManage = profile?.role === 'CrewLead' || profile?.role === 'Admin';
  const list = data.jobs.filter((j) => {
    if (f === 'Open') return !['Completed', 'Canceled'].includes(j.status);
    if (f === 'Unclaimed') return j.status === 'Requested' && !j.crew_id;
    if (f === 'All') return true;
    return j.status === f;
  });

  const job = data.jobs.find((j) => j.id === open);
  const jobCustomer = job ? data.customers.find((c) => c.id === job.customer_id) : null;
  const jobCrew = job?.crew_id ? data.profiles.find((p) => p.id === job.crew_id) : null;
  const jobLog = job ? data.activity.filter((a) => a.job_id === job.id) : [];

  const changeStatus = async (status: string) => {
    if (!job) return;
    setBusy(true); setErr('');
    try {
      await setJobStatus(job.id, status as never, note || undefined);
      if (note) { await addActivity(job.id, `Note: ${note}`); setNote(''); }
      await reload();
    } catch (e) { setErr(friendlyError(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">Jobs</div>
          <h2>All jobs</h2>
        </div>
        <div className="act">
          {FILTERS.map((k) => (
            <button key={k} className={`btn sm ${f === k ? 'gold' : ''}`} onClick={() => setF(k)}>{k}</button>
          ))}
        </div>
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      <div className="glass list">
        {list.map((j) => {
          const crew = j.crew_id ? data.profiles.find((p) => p.id === j.crew_id) : null;
          return (
            <button key={j.id} type="button" className="jr" onClick={() => setOpen(open === j.id ? null : j.id)}>
              <span className="ic"><Icon name={categoryIcon(j.category)} size={22} /></span>
              <span>
                <span className="t">{j.title}</span>
                <span className="s"><span className="mono">{j.id}</span> · {j.service_address} · {j.preferred_date ? `${fmtDay(j.preferred_date)}${j.time_slot ? `, ${j.time_slot}` : ''}` : 'not scheduled'}{crew ? ` · ${crew.full_name}` : ''}</span>
              </span>
              <span className="e"><Pill status={j.status} /><span className={`prio ${j.priority}`}>{j.priority}</span></span>
            </button>
          );
        })}
        {!list.length && <div className="empty">No jobs in this view.</div>}
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
              <dt>Customer</dt><dd>{jobCustomer.name} · {jobCustomer.phone ?? '—'} · {jobCustomer.email ?? ''}</dd>
              <dt>Address</dt><dd>{job.service_address}</dd>
              <dt>Crew</dt><dd>{jobCrew?.full_name ?? 'Unassigned'}</dd>
              <dt>Details</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{job.description || '—'}</dd>
            </dl>
          )}
          {canManage && (
            <>
              <div className="row">
                {['Scheduled', 'In Progress', 'On Hold', 'Completed', 'Canceled'].map((s) => (
                  <button key={s} className="btn sm" disabled={busy || job.status === s} onClick={() => void changeStatus(s)}>{s}</button>
                ))}
              </div>
              <div className="row">
                <input type="text" placeholder="Note for the activity log" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
              </div>
            </>
          )}
          <div className="stack">
            <h3>Activity</h3>
            <ul className="tl">{jobLog.map((l) => <li key={l.id}><div>{l.action}<small>{fmtDT(l.at)}</small></div></li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}
