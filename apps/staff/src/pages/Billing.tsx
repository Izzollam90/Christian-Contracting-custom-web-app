import { useState } from 'react';
import { Pill, usd, fmtDT, fmtShort, useAuth } from '@herkey/shared';
import type { StaffData } from '../data';
import { invoiceFromEstimate, docTotal } from '../data';

export default function Billing({ data, reload }: { data: StaffData; reload: () => Promise<void> }) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const canInvoice = profile?.role === 'Finance' || profile?.role === 'Admin';
  const jobOf = (id: string) => data.jobs.find((j) => j.id === id);
  const custOf = (j: { customer_id: string }) => data.customers.find((c) => c.id === j.customer_id);

  const makeInvoice = async (estimateId: string) => {
    setBusy(estimateId); setErr(''); setMsg('');
    try { await invoiceFromEstimate(estimateId); setMsg(`Invoice drafted from ${estimateId}.`); await reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  };

  const est = [...data.estimates].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const inv = [...data.invoices].sort((a, b) => +new Date(b.issued_at ?? '1970') - +new Date(a.issued_at ?? '1970'));

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">Estimates & invoices</div>
          <h2>Billing</h2>
          <p>An invoice can be drafted from an Accepted estimate — lines are copied. Customers accept/decline estimates in their own app.</p>
        </div>
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      {msg && <div style={{ color: 'var(--ok)' }} role="status">{msg}</div>}

      <div className="glass pad stack">
        <h3>Estimates</h3>
        <div className="tablewrap">
          <table>
            <thead><tr><th>ID</th><th>Job</th><th>Customer</th><th className="n">Total</th><th>Status</th><th>Sent</th><th></th></tr></thead>
            <tbody>
              {est.map((e) => {
                const j = jobOf(e.job_id);
                const total = docTotal(data.estimateLines.filter((l) => l.estimate_id === e.id));
                return (
                  <tr key={e.id}>
                    <td className="mono">{e.id}</td>
                    <td>{e.job_id} · {j?.title ?? ''}</td>
                    <td>{j ? custOf(j)?.name : '—'}</td>
                    <td className="n">{usd(total)}</td>
                    <td><Pill status={e.status} /></td>
                    <td className="muted">{e.sent_at ? fmtDT(e.sent_at) : '—'}</td>
                    <td>{canInvoice && e.status === 'Accepted' && !data.invoices.some((i) => i.estimate_id === e.id) && (
                      <button className="btn sm gold" disabled={busy === e.id} onClick={() => void makeInvoice(e.id)}>Draft invoice</button>
                    )}</td>
                  </tr>
                );
              })}
              {!est.length && <tr><td colSpan={7} className="muted">No estimates yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass pad stack">
        <h3>Invoices</h3>
        <div className="tablewrap">
          <table>
            <thead><tr><th>ID</th><th>Job</th><th>Customer</th><th className="n">Total</th><th>Status</th><th>Issued</th><th>Due</th><th>Paid</th></tr></thead>
            <tbody>
              {inv.map((i) => {
                const j = jobOf(i.job_id);
                const total = docTotal(data.invoiceLines.filter((l) => l.invoice_id === i.id));
                return (
                  <tr key={i.id}>
                    <td className="mono">{i.id}</td>
                    <td>{i.job_id} · {j?.title ?? ''}</td>
                    <td>{j ? custOf(j)?.name : '—'}</td>
                    <td className="n">{usd(total)}</td>
                    <td><Pill status={i.status} /></td>
                    <td className="muted">{i.issued_at ? fmtShort(i.issued_at) : '—'}</td>
                    <td className="muted">{i.due_date ? fmtShort(i.due_date) : '—'}</td>
                    <td className="muted">{i.paid_at ? `${fmtShort(i.paid_at)}${i.payment_method ? ` · ${i.payment_method}` : ''}` : '—'}</td>
                  </tr>
                );
              })}
              {!inv.length && <tr><td colSpan={8} className="muted">No invoices yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
