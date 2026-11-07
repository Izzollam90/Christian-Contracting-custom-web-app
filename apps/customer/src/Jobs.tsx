import { useState } from 'react';
import {
  STAGES, Pill, Tracker, Icon, categoryIcon, usd, fmtDay, fmtDT, Avatar, Empty,
} from '@herkey/shared';
import type { Estimate, Invoice, Job } from '@herkey/shared';
import { useCustomerData } from './useCustomerData';
import { useStepUp } from '@herkey/shared';
import { cancelJob, respondEstimate, linesTotal } from './data';

type Go = (r: 'home' | 'request' | 'jobs' | 'billing') => void;

const when = (j: Job, slots: { slot: string }[]) => {
  const s = slots.find((x) => x.slot === j.time_slot);
  return j.preferred_date ? `${fmtDay(j.preferred_date)}${s ? `, ${s.slot}` : ''}` : "We'll confirm a time with you";
};

function DocCard({ doc, kind, lines, job, onChanged }: {
  doc: Estimate | Invoice;
  kind: 'estimate' | 'invoice';
  lines: { description: string; quantity: number; line_total_cents: number }[];
  job: Job | undefined;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const step = useStepUp();
  const total = linesTotal(lines);
  const respond = async (accept: boolean) => {
    setBusy(true); setErr('');
    try { await step.run(async () => { await respondEstimate(doc.id, accept); onChanged(); }); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  return (
    <div className="glass pad doc">
      <div className="head">
        <div>
          <div className="jobid">{doc.id} · {kind.toUpperCase()}</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '1.1rem' }}>{job?.title ?? ''}</div>
          <div className="muted" style={{ fontSize: '.85rem' }}>
            {'sent_at' in doc && doc.sent_at ? fmtDT(doc.sent_at) : ''}
            {'issued_at' in doc && doc.issued_at ? fmtDT(doc.issued_at) : ''}
            {'due_date' in doc && doc.due_date ? ` · due ${fmtDay(doc.due_date)}` : ''}
          </div>
        </div>
        <div className="amt">{usd(total)}</div>
      </div>
      <div><Pill status={doc.status} /></div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Item</th><th className="n">Qty</th><th className="n">Amount</th></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}><td>{l.description}</td><td className="n">{l.quantity}</td><td className="n">{usd(l.line_total_cents)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {kind === 'estimate' && doc.status === 'Sent' && (
        <div className="row">
          <button className="btn gold" disabled={busy} onClick={() => void respond(true)}>Accept estimate</button>
          <button className="btn" disabled={busy} onClick={() => void respond(false)}>Decline</button>
        </div>
      )}
      {kind === 'invoice' && doc.status === 'Unpaid' && (
        <div className="row">
          <button className="btn" disabled title="Online payment is coming soon">Pay online · coming soon</button>
          <span className="muted" style={{ fontSize: '.85rem' }}>Pay by check or call the office for now.</span>
        </div>
      )}
      {err && <div className="err">{err}</div>}
      {step.challenge && <div className="scrim"><div className="drawer" style={{ margin: 'auto' }}>{step.challenge}</div></div>}
    </div>
  );
}

export default function JobsPage({ go }: { go: Go }) {
  void go;
  const d = useCustomerData();
  const [filter, setFilter] = useState<'Active' | 'Past'>('Active');
  const [open, setOpen] = useState<string | null>(null);
  const [cancelArm, setCancelArm] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const list = d.jobs
    .filter((j) => (filter === 'Active' ? !['Completed', 'Canceled'].includes(j.status) : ['Completed', 'Canceled'].includes(j.status)))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const openJob = d.jobs.find((j) => j.id === open);
  const openDocs = openJob
    ? [
        ...d.estimates.filter((e) => e.job_id === openJob.id).map((e) => ({ kind: 'estimate' as const, doc: e, lines: d.estimateLines.filter((l) => l.estimate_id === e.id) })),
        ...d.invoices.filter((i) => i.job_id === openJob.id).map((i) => ({ kind: 'invoice' as const, doc: i, lines: d.invoiceLines.filter((l) => l.invoice_id === i.id) })),
      ]
    : [];
  const openLog = openJob ? d.activity.filter((a) => a.job_id === openJob.id) : [];
  const openCrew = openJob?.crew_id ? d.crew.find((c) => c.id === openJob.crew_id) : null;

  const doCancel = async (jobId: string) => {
    if (cancelArm !== jobId) { setCancelArm(jobId); return; }
    setCancelArm(null); setErr('');
    try { await cancelJob(jobId); await d.reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <section className="wrap section stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'end' }}>
        <div>
          <div className="eyebrow">My jobs</div>
          <h2 style={{ fontSize: 'clamp(1.7rem,4vw,2.6rem)', marginTop: 6 }}>Every job, every step.</h2>
        </div>
        <div className="row">
          {(['Active', 'Past'] as const).map((k) => (
            <button key={k} className={`btn sm ${filter === k ? 'gold' : ''}`} onClick={() => setFilter(k)}>{k}</button>
          ))}
        </div>
      </div>

      <div className="jobs">
        {list.length ? list.map((j) => {
          const i = STAGES.indexOf(j.status);
          return (
            <button key={j.id} type="button" className="glass jobcard" onClick={() => { setOpen(j.id); setCancelArm(null); }}>
              <span className="ic"><Icon name={categoryIcon(j.category)} size={26} /></span>
              <span style={{ minWidth: 0 }}>
                <b>{j.title}</b>
                <small>{j.id} · {when(j, d.slots)}</small>
                <span className="mini"><i style={{ width: `${Math.max(6, (i / (STAGES.length - 1)) * 100)}%` }} /></span>
              </span>
              <Pill status={j.status} />
            </button>
          );
        }) : <Empty>{filter === 'Active' ? 'Nothing in progress right now.' : 'No past jobs yet.'}</Empty>}
      </div>

      {openJob && (
        <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) { setOpen(null); setCancelArm(null); } }}>
          <div className="drawer" role="dialog" aria-modal="true" aria-label={openJob.title}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="jobid">{openJob.id} · {openJob.category.toUpperCase()}</span>
              <button className="btn sm" onClick={() => { setOpen(null); setCancelArm(null); }}>Close</button>
            </div>
            <div>
              <h2 style={{ fontSize: '1.8rem' }}>{openJob.title}</h2>
              <div className="row" style={{ marginTop: 8 }}><Pill status={openJob.status} /></div>
            </div>
            <div className="glass pad"><Tracker status={openJob.status} jobId={openJob.id} /></div>
            <div className="glass pad stack">
              {openCrew ? (
                <div className="crew"><Avatar name={openCrew.full_name} /><div><b>{openCrew.full_name}</b><div className="muted" style={{ fontSize: '.85rem' }}>{openCrew.role}</div></div></div>
              ) : <div className="muted">Waiting for a crew member to accept.</div>}
              <dl className="kv">
                <dt>When</dt><dd>{when(openJob, d.slots)}</dd>
                <dt>Where</dt><dd>{openJob.service_address}</dd>
                <dt>Details</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{openJob.description || '—'}</dd>
              </dl>
            </div>
            {openDocs.length > 0 && (
              <div className="stack">
                <h3>Estimates & invoices</h3>
                {openDocs.map(({ kind, doc, lines }) => (
                  <DocCard key={doc.id} doc={doc} kind={kind} lines={lines} job={openJob} onChanged={() => void d.reload()} />
                ))}
              </div>
            )}
            <div className="stack">
              <h3>Activity</h3>
              <ul className="tl">
                {openLog.map((l) => <li key={l.id}><div>{l.action}<small>{fmtDT(l.at)}</small></div></li>)}
              </ul>
            </div>
            {!['Completed', 'Canceled', 'In Progress'].includes(openJob.status) && (
              <div className="row">
                <button className={`btn ${cancelArm === openJob.id ? 'danger' : ''}`} onClick={() => void doCancel(openJob.id)}>
                  {cancelArm === openJob.id ? 'Tap again to confirm' : 'Cancel this request'}
                </button>
                <span className="muted" style={{ fontSize: '.85rem' }}>{cancelArm === openJob.id ? 'This tells the office you no longer need it.' : ''}</span>
              </div>
            )}
            {err && <div className="err">{err}</div>}
          </div>
        </div>
      )}
    </section>
  );
}
