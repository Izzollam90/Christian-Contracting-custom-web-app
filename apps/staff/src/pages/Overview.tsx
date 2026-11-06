import { TIMEZONE, Pill, usd, fmtDay } from '@herkey/shared';
import type { StaffData } from '../data';
import { docTotal } from '../data';

// KPI definitions from requirements §7.
export function metrics(d: StaffData) {
  const open = d.jobs.filter((j) => !['Completed', 'Canceled'].includes(j.status));
  const monthStart = new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const compMonth = d.jobs.filter((j) => j.completed_at && new Date(j.completed_at) >= monthStart).length;
  const d30 = Date.now() - 30 * 864e5;
  const spend30 = d.expenses.filter((e) => e.status === 'Approved' && +new Date(e.expense_date) > d30)
    .reduce((a, e) => a + e.amount_cents, 0);
  const unpaid = d.invoices.filter((i) => i.status === 'Unpaid');
  const outstanding = unpaid.reduce((a, i) => a + docTotal(d.invoiceLines.filter((l) => l.invoice_id === i.id)), 0);
  const hrs7 = d.time.filter((t) => +new Date(t.clock_in) > Date.now() - 7 * 864e5)
    .reduce((a, t) => a + ((t.clock_out ? +new Date(t.clock_out) : Date.now()) - +new Date(t.clock_in)) / 36e5, 0);
  return {
    open: open.length,
    unclaimed: open.filter((j) => !j.crew_id).length,
    compMonth,
    spend30,
    outstanding,
    unpaidCount: unpaid.length,
    hrs7,
  };
}

export default function Overview({ data }: { data: StaffData; reload: () => Promise<void> }) {
  const m = metrics(data);
  const byStatus = ['Requested', 'Accepted', 'Scheduled', 'In Progress', 'On Hold', 'Completed', 'Canceled']
    .map((s) => [s, data.jobs.filter((j) => j.status === s).length] as [string, number])
    .filter(([, n]) => n > 0);
  const weekly: [string, number][] = [];
  for (let i = 7; i >= 0; i--) {
    const end = Date.now() - i * 7 * 864e5;
    const start = end - 7 * 864e5;
    weekly.push([
      new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TIMEZONE }),
      data.expenses.filter((e) => e.status === 'Approved' && +new Date(e.expense_date) > start && +new Date(e.expense_date) <= end)
        .reduce((a, e) => a + e.amount_cents, 0),
    ]);
  }
  const mx = Math.max(1, ...weekly.map((w) => w[1]));

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">Overview</div>
          <h2>Operations at a glance</h2>
        </div>
      </div>
      <div className="kpis">
        <div className="glass kpi"><small>Open jobs</small><b>{m.open}</b><span>{m.unclaimed} waiting for crew</span></div>
        <div className="glass kpi"><small>Completed this month</small><b>{m.compMonth}</b><span>by completion date</span></div>
        <div className="glass kpi"><small>Approved spending · 30d</small><b>{usd(m.spend30)}</b><span>approved expenses only</span></div>
        <div className="glass kpi"><small>Outstanding invoices</small><b>{usd(m.outstanding)}</b><span>{m.unpaidCount} unpaid</span></div>
        <div className="glass kpi"><small>Crew hours · 7d</small><b>{m.hrs7.toFixed(0)}</b><span>from time clock</span></div>
      </div>

      <div className="grid">
        <div className="glass pad stack">
          <h3>Jobs by status</h3>
          <div className="bars">
            {byStatus.map(([s, n]) => (
              <div className="bar" key={s}>
                <span>{s}</span>
                <div className="tr"><div className="fl" style={{ width: `${(n / Math.max(1, ...byStatus.map((x) => x[1]))) * 100}%` }} /></div>
                <span className="v">{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass pad stack">
          <h3>Approved spending · last 8 weeks</h3>
          <div className="bars">
            {weekly.map(([label, v]) => (
              <div className="bar" key={label}>
                <span>{label}</span>
                <div className="tr"><div className="fl alt" style={{ width: `${(v / mx) * 100}%` }} /></div>
                <span className="v">{usd(v)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass pad stack">
        <h3>Recent open jobs</h3>
        <div className="list" style={{ border: '1px solid var(--line)', borderRadius: 12 }}>
          {data.jobs.filter((j) => !['Completed', 'Canceled'].includes(j.status)).slice(0, 6).map((j) => (
            <div className="jr" key={j.id} style={{ cursor: 'default' }}>
              <span className="t" style={{ gridColumn: '1 / -1' }}>{j.id} · {j.title}</span>
              <span className="s">{j.preferred_date ? `${fmtDay(j.preferred_date)}${j.time_slot ? `, ${j.time_slot}` : ''}` : 'not scheduled'}</span>
              <span className="e"><Pill status={j.status} /></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
