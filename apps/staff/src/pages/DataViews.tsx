import { useState } from 'react';
import { usd, fmtDT, fmtShort } from '@herkey/shared';
import type { StaffData } from '../data';

// Admin-only raw tables with CSV export.
const TABLES: Record<string, { cols: string[]; rows: (d: StaffData) => (string | number | boolean | null)[][] }> = {
  jobs: { cols: ['id', 'title', 'category', 'priority', 'status', 'customer_id', 'crew_id', 'preferred_date', 'time_slot', 'created_at'], rows: (d) => d.jobs.map((j) => [j.id, j.title, j.category, j.priority, j.status, j.customer_id, j.crew_id, j.preferred_date, j.time_slot, fmtDT(j.created_at)]) },
  customers: { cols: ['id', 'name', 'email', 'phone', 'street', 'city', 'state', 'zip', 'latitude', 'longitude'], rows: (d) => d.customers.map((c) => [c.id, c.name, c.email, c.phone, c.street, c.city, c.state, c.zip, c.latitude, c.longitude]) },
  estimates: { cols: ['id', 'job_id', 'status', 'created_at', 'sent_at', 'responded_at'], rows: (d) => d.estimates.map((e) => [e.id, e.job_id, e.status, fmtDT(e.created_at), e.sent_at ? fmtDT(e.sent_at) : null, e.responded_at ? fmtDT(e.responded_at) : null]) },
  estimate_lines: { cols: ['id', 'estimate_id', 'description', 'quantity', 'unit_price_cents', 'line_total_cents'], rows: (d) => d.estimateLines.map((l) => [l.id, l.estimate_id, l.description, l.quantity, l.unit_price_cents, l.line_total_cents]) },
  invoices: { cols: ['id', 'job_id', 'estimate_id', 'status', 'issued_at', 'due_date', 'paid_at', 'payment_method'], rows: (d) => d.invoices.map((i) => [i.id, i.job_id, i.estimate_id, i.status, i.issued_at ? fmtDT(i.issued_at) : null, i.due_date, i.paid_at ? fmtDT(i.paid_at) : null, i.payment_method]) },
  invoice_lines: { cols: ['id', 'invoice_id', 'description', 'quantity', 'unit_price_cents', 'line_total_cents'], rows: (d) => d.invoiceLines.map((l) => [l.id, l.invoice_id, l.description, l.quantity, l.unit_price_cents, l.line_total_cents]) },
  expenses: { cols: ['id', 'submitted_by', 'job_id', 'category', 'vendor', 'amount_cents', 'expense_date', 'status', 'note'], rows: (d) => d.expenses.map((e) => [e.id, e.submitted_by, e.job_id, e.category, e.vendor, e.amount_cents, e.expense_date, e.status, e.note]) },
  time_entries: { cols: ['id', 'user_id', 'job_id', 'customer_id', 'clock_in', 'clock_out', 'distance_meters', 'location_check', 'review', 'note'], rows: (d) => d.time.map((t) => [t.id, t.user_id, t.job_id, t.customer_id, fmtDT(t.clock_in), t.clock_out ? fmtDT(t.clock_out) : null, t.distance_meters, t.location_check, t.review, t.note]) },
  activity_log: { cols: ['id', 'job_id', 'at', 'actor_id', 'action', 'visible_to_customer'], rows: (d) => d.activity.map((a) => [a.id, a.job_id, fmtDT(a.at), a.actor_id, a.action, a.visible_to_customer]) },
  profiles: { cols: ['id', 'email', 'full_name', 'role', 'active', 'hourly_rate_cents'], rows: (d) => d.profiles.map((p) => [p.id, p.email, p.full_name, p.role, p.active, p.hourly_rate_cents]) },
};

const csvCell = (v: string | number | boolean | null) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function DataViews({ data }: { data: StaffData; reload: () => Promise<void> }) {
  const [table, setTable] = useState<keyof typeof TABLES>('jobs');
  const t = TABLES[table]!;
  const rows = t.rows(data);

  const exportCsv = () => {
    const csv = [t.cols.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `herkey-${table}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">Data tables</div>
          <h2>Raw data (read-only)</h2>
          <p>Admin only — enforced by row-level security, not by hiding this screen.</p>
        </div>
        <div className="act">
          <select value={table} onChange={(e) => setTable(e.target.value as keyof typeof TABLES)}>
            {Object.keys(TABLES).map((k) => <option key={k}>{k}</option>)}
          </select>
          <button className="btn gold sm" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>
      <div className="glass pad">
        <div className="tablewrap">
          <table>
            <thead><tr>{t.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {rows.slice(0, 200).map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} className={typeof c === 'number' ? 'n' : ''}>{c == null ? '—' : c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 200 && <div className="muted">Showing 200 of {rows.length} rows — export CSV for all.</div>}
        <div className="muted" style={{ marginTop: 8 }}>{rows.length} rows · money in cents · times UTC ({fmtShort(new Date().toISOString())} shown local)</div>
      </div>
      <div className="muted">Money columns are integer cents; usd display: {usd(123456)}</div>
    </div>
  );
}
