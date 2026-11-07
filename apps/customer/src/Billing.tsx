import { useState } from 'react';
import { Pill, usd, fmtShort, useAal2, useStepUp } from '@herkey/shared';
import type { Estimate, Invoice, Job } from '@herkey/shared';
import { useCustomerData } from './useCustomerData';
import { respondEstimate, docTotal, linesTotal } from './data';

type Go = (r: 'home' | 'request' | 'jobs' | 'billing' | 'security' | 'privacy') => void;

function Doc({ doc, kind, lines, job, onChanged }: {
  doc: Estimate | Invoice;
  kind: 'estimate' | 'invoice';
  lines: { description: string; quantity: number; line_total_cents: number }[];
  job: Job | undefined;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const { aal2, refresh: refreshAal2 } = useAal2();
  const { requireStepUp, StepUpModal } = useStepUp(aal2, refreshAal2);

  const respond = async (accept: boolean) => {
    setBusy(true);
    try {
      if (accept) {
        await requireStepUp(async () => { await respondEstimate(doc.id, true); onChanged(); });
      } else {
        await respondEstimate(doc.id, false); onChanged();
      }
    } catch { /* RLS error surfaced by reload */ }
    finally { setBusy(false); }
  };
  return (
    <div className="glass pad doc">
      <div className="head">
        <div>
          <div className="jobid">{doc.id} · {kind.toUpperCase()}</div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: '1.1rem' }}>{job?.title ?? ''}</div>
          <div className="muted" style={{ fontSize: '.85rem' }}>
            {'sent_at' in doc && doc.sent_at ? fmtShort(doc.sent_at) : ''}
            {'issued_at' in doc && doc.issued_at ? fmtShort(doc.issued_at) : ''}
            {'due_date' in doc && doc.due_date ? ` · due ${fmtShort(doc.due_date)}` : ''}
          </div>
        </div>
        <div className="amt">{usd(linesTotal(lines))}</div>
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
      {StepUpModal}
    </div>
  );
}

export default function Billing({ go }: { go: Go }) {
  void go;
  const d = useCustomerData();
  const est = [...d.estimates].sort((a, b) => (a.status === 'Sent' ? -1 : 1) - (b.status === 'Sent' ? -1 : 1) || +new Date(b.created_at) - +new Date(a.created_at));
  const inv = [...d.invoices].sort((a, b) => +new Date(b.issued_at ?? '1970-01-01') - +new Date(a.issued_at ?? '1970-01-01'));
  const jobOf = (id: string) => d.jobs.find((j) => j.id === id);
  const owed = inv.filter((i) => i.status === 'Unpaid').reduce((a, i) => a + linesTotal(d.invoiceLines.filter((l) => l.invoice_id === i.id)), 0);
  const paid = inv.filter((i) => i.status === 'Paid').reduce((a, i) => a + linesTotal(d.invoiceLines.filter((l) => l.invoice_id === i.id)), 0);

  return (
    <section className="wrap section stack">
      <div>
        <div className="eyebrow">Billing</div>
        <h2 style={{ fontSize: 'clamp(1.7rem,4vw,2.6rem)', marginTop: 6 }}>Clear, itemized, no surprises.</h2>
      </div>
      <div className="sumbar">
        <div className="glass stat"><small>Balance due</small><b>{usd(owed)}</b></div>
        <div className="glass stat"><small>Paid to date</small><b>{usd(paid)}</b></div>
        <div className="glass stat"><small>Estimates waiting</small><b>{est.filter((e) => e.status === 'Sent').length}</b></div>
      </div>
      <h3 style={{ marginTop: 10 }}>Estimates</h3>
      <div className="grid">
        {est.length ? est.map((e) => (
          <Doc key={e.id} doc={e} kind="estimate" lines={d.estimateLines.filter((l) => l.estimate_id === e.id)} job={jobOf(e.job_id)} onChanged={() => void d.reload()} />
        )) : <div className="glass pad empty">No estimates yet.</div>}
      </div>
      <h3 style={{ marginTop: 10 }}>Invoices</h3>
      <div className="grid">
        {inv.length ? inv.map((i) => (
          <Doc key={i.id} doc={i} kind="invoice" lines={d.invoiceLines.filter((l) => l.invoice_id === i.id)} job={jobOf(i.job_id)} onChanged={() => void d.reload()} />
        )) : <div className="glass pad empty">No invoices yet.</div>}
      </div>
    </section>
  );
}
