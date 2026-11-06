import { STAGES, Pill, Tracker, usd, fmtDay, Avatar, COMPANY_NAME, Icon, categoryIcon } from '@herkey/shared';
import type { Job } from '@herkey/shared';
import { useCustomerData } from './useCustomerData';
import { linesTotal } from './data';

type Go = (r: 'home' | 'request' | 'jobs' | 'billing') => void;

const when = (j: Job, slots: { slot: string }[]) => {
  const s = slots.find((x) => x.slot === j.time_slot);
  return j.preferred_date ? `${fmtDay(j.preferred_date)}${s ? `, ${s.slot}` : ''}` : "We'll confirm a time with you";
};

export default function Home({ go }: { go: Go }) {
  const d = useCustomerData();
  const active = d.jobs.filter((j) => !['Completed', 'Canceled'].includes(j.status))
    .sort((a, b) => STAGES.indexOf(b.status) - STAGES.indexOf(a.status));
  const lead = active[0];
  const pending = d.estimates.filter((e) => e.status === 'Sent');
  const owed = d.invoices.filter((i) => i.status === 'Unpaid')
    .reduce((a, i) => a + linesTotal(d.invoiceLines.filter((l) => l.invoice_id === i.id)), 0);
  const leadCrew = lead?.crew_id ? d.crew.find((c) => c.id === lead.crew_id) : null;
  const leadLog = lead ? d.activity.filter((a) => a.job_id === lead.id).slice(-1)[0] : null;

  return (
    <>
      <section className="hero wrap">
        <div className="eyebrow rule rise">{COMPANY_NAME} · Customer portal</div>
        <h1 className="rise d1">One call, every solution.<span className="g">We've got it from here.</span></h1>
        <p className="lede rise d2">
          <span className="welcome">Welcome back{d.profileName ? `, ${d.profileName}` : ''}.</span>{' '}
          Request a repair, pick a time that suits you, and follow your crew from the first call to the final walkthrough.
        </p>
        <div className="cta rise d3">
          <button className="btn gold" onClick={() => go('request')}>Request service <Icon name="arrow" size={18} /></button>
          <button className="btn" onClick={() => go('jobs')}>Track my jobs</button>
        </div>
      </section>

      <section className="wrap section stack" style={{ paddingTop: 0 }}>
        {lead ? (
          <div className="glass spot rise d4">
            <div className="l">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="eyebrow">Happening now</span><Pill status={lead.status} />
              </div>
              <div>
                <div className="jobid">{lead.id} · {lead.category.toUpperCase()}</div>
                <div className="big">{lead.title}</div>
              </div>
              <Tracker status={lead.status} jobId={lead.id} />
              <div className="row">
                <button className="btn sm" onClick={() => { window.location.hash = 'jobs'; }}>See details</button>
                {active.length > 1 && <button className="btn ghost sm" onClick={() => go('jobs')}>+{active.length - 1} more active</button>}
              </div>
            </div>
            <div className="r">
              {leadCrew ? (
                <div className="crew">
                  <Avatar name={leadCrew.full_name} />
                  <div><b>{leadCrew.full_name}</b><div className="muted" style={{ fontSize: '.85rem' }}>{leadCrew.role}</div></div>
                </div>
              ) : <div className="muted">A crew member will accept this soon.</div>}
              <dl className="kv">
                <dt>When</dt><dd>{when(lead, d.slots)}</dd>
                <dt>Where</dt><dd>{lead.service_address}</dd>
                <dt>Latest</dt><dd>{leadLog?.action ?? 'Request received'}</dd>
              </dl>
            </div>
          </div>
        ) : (
          <div className="glass pad empty">No active jobs. Need something fixed?{' '}
            <button className="btn ghost" onClick={() => go('request')}>Request service</button>
          </div>
        )}

        <div className="sumbar">
          <div className="glass stat"><small>Active jobs</small><b>{active.length}</b></div>
          <div className="glass stat"><small>Estimates to review</small>
            <b style={{ color: pending.length ? 'var(--gold-hi)' : 'inherit' }}>{pending.length}</b>
            {pending.length > 0 && <button className="btn ghost sm" style={{ paddingLeft: 0 }} onClick={() => go('billing')}>Review now →</button>}
          </div>
          <div className="glass stat"><small>Balance due</small><b>{usd(owed)}</b></div>
        </div>
      </section>

      <section className="wrap section stack">
        <div className="eyebrow rule">What can we fix?</div>
        <h2 style={{ fontSize: 'clamp(1.6rem,3.6vw,2.3rem)' }}>Start a request in one tap.</h2>
        <div className="svc">
          {d.categories.map((c) => (
            <button key={c.category} type="button" className="tile" onClick={() => { window.location.hash = `request?cat=${encodeURIComponent(c.category)}`; }}>
              <Icon name={categoryIcon(c.category)} size={30} />
              <b>{c.category}</b><small>{c.description}</small>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
