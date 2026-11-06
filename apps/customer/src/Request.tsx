import { useMemo, useState } from 'react';
import {
  PRIORITIES, Icon, categoryIcon, nextWorkdays, weekdayShort, dayNum, monthShort,
} from '@herkey/shared';
import type { Job, JobPriority } from '@herkey/shared';
import { useCustomerData } from './useCustomerData';
import { createJob } from './data';
import { useAuth } from '@herkey/shared';

type Go = (r: 'home' | 'request' | 'jobs' | 'billing') => void;

interface Wiz {
  step: number;
  category: string | null;
  title: string;
  desc: string;
  address: string;
  priority: JobPriority;
  day: string | null;
  slot: string | null;
}

const TITLES = ['What needs fixing?', 'Tell us about it', 'Pick a time that works', 'Look it over'];

export default function Request({ go }: { go: Go }) {
  const d = useCustomerData();
  const { profile } = useAuth();
  const [w, setW] = useState<Wiz>(() => {
    const cat = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('cat');
    return { step: cat ? 2 : 1, category: cat, title: '', desc: '', address: '', priority: 'Routine', day: null, slot: null };
  });
  const [sent, setSent] = useState<Job | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => nextWorkdays(10), []);
  const taken = (day: string, slot: string) =>
    d.jobs.some((j) => j.preferred_date === day && j.time_slot === slot && !['Completed', 'Canceled'].includes(j.status));

  if (sent) {
    return (
      <section className="wrap section">
        <div className="glass pad stack" style={{ maxWidth: 820, margin: '0 auto', alignItems: 'flex-start' }}>
          <div className="done-mark"><Icon name="check" size={42} sw={3} /></div>
          <div className="eyebrow">{sent.id}</div>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)' }}>Request received.</h2>
          <p className="muted" style={{ margin: 0, maxWidth: '52ch' }}>
            We have everything we need for <b style={{ color: 'var(--text)' }}>{sent.title}</b>. Here's what happens next:
          </p>
          <div className="next" style={{ width: '100%' }}>
            <div><b>We review it</b><p className="muted" style={{ margin: '4px 0 0' }}>The office checks the details and may send an estimate.</p></div>
            <div><b>A crew member accepts</b><p className="muted" style={{ margin: '4px 0 0' }}>You'll see who's coming and their role.</p></div>
            <div><b>Your time is confirmed</b><p className="muted" style={{ margin: '4px 0 0' }}>Track every step from My jobs.</p></div>
          </div>
          <div className="row">
            <button className="btn gold" onClick={() => go('jobs')}>Track this job</button>
            <button className="btn" onClick={() => { setSent(null); setW({ step: 1, category: null, title: '', desc: '', address: '', priority: 'Routine', day: null, slot: null }); }}>Request something else</button>
          </div>
        </div>
      </section>
    );
  }

  const set = (patch: Partial<Wiz>) => setW((x) => ({ ...x, ...patch }));
  const day = w.day ?? days[0]!;

  const next = async () => {
    setErr('');
    if (w.step === 1 && !w.category) return setErr('Choose the kind of work to continue.');
    if (w.step === 2) {
      if (!w.title.trim()) return setErr('Add a short name so the crew knows what the job is.');
      if (!w.address.trim()) return setErr('Add the service address.');
    }
    if (w.step === 3 && !w.slot) return setErr('Pick a time slot. Booked times are crossed out.');
    if (w.step === 4) {
      if (!profile?.customer_id) return setErr('Your profile is not linked to a customer record yet. Ask the office.');
      setBusy(true);
      try {
        const job = await createJob({
          profile, title: w.title.trim(), description: w.desc.trim(), category: w.category!,
          priority: w.priority, serviceAddress: w.address.trim(), preferredDate: day, timeSlot: w.slot!,
        });
        setSent(job);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally { setBusy(false); }
      return;
    }
    set({ step: w.step + 1 });
  };

  return (
    <section className="wrap section">
      <div className="glass pad stack rise" style={{ maxWidth: 820, margin: '0 auto' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'end' }}>
          <div>
            <div className="eyebrow">Step {w.step} of 4</div>
            <h2 style={{ fontSize: 'clamp(1.7rem,4vw,2.6rem)', marginTop: 6 }}>{TITLES[w.step - 1]}</h2>
          </div>
          {w.step > 1 && <button className="btn ghost" onClick={() => set({ step: w.step - 1 })}><Icon name="back" size={16} /> Back</button>}
        </div>
        <div className="steps" aria-hidden="true">{[1, 2, 3, 4].map((i) => <span key={i} className={i <= w.step ? 'on' : ''} />)}</div>

        {w.step === 1 && (
          <div className="svc">
            {d.categories.map((c) => (
              <button key={c.category} type="button" className="tile" aria-pressed={w.category === c.category}
                onClick={() => set({ category: c.category, step: 2 })}>
                <Icon name={categoryIcon(c.category)} size={30} /><b>{c.category}</b><small>{c.description}</small>
              </button>
            ))}
          </div>
        )}

        {w.step === 2 && (
          <div className="stack">
            <label className="f">Give it a short name
              <input type="text" maxLength={120} placeholder="e.g. Bathroom fan is rattling" value={w.title} onChange={(e) => set({ title: e.target.value })} />
            </label>
            <label className="f">What's going on?
              <textarea placeholder="When it started, what you've tried, anything about access, parking or pets." value={w.desc} onChange={(e) => set({ desc: e.target.value })} />
            </label>
            <label className="f">Service address
              <input type="text" placeholder="Street, unit, city, ZIP" value={w.address} onChange={(e) => set({ address: e.target.value })} />
            </label>
            <div className="f" style={{ fontSize: '.85rem', fontWeight: 600, color: '#C9CDD2' }}>How soon?</div>
            <div className="seg" role="group" aria-label="Urgency">
              {PRIORITIES.map((p) => (
                <button key={p.value} type="button" data-prio={p.value} aria-pressed={w.priority === p.value} onClick={() => set({ priority: p.value })}>
                  <b>{p.label}</b><small>{p.hint}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {w.step === 3 && (
          <div className="stack">
            <div className="days" role="group" aria-label="Day">
              {days.map((dd) => (
                <button key={dd} type="button" className="day" aria-pressed={day === dd} onClick={() => set({ day: dd, slot: w.slot && taken(dd, w.slot) ? null : w.slot })}>
                  <small>{weekdayShort(dd)}</small><b>{dayNum(dd)}</b><small>{monthShort(dd)}</small>
                </button>
              ))}
            </div>
            <div className="slots" role="group" aria-label="Time">
              {d.slots.map((s) => {
                const isTaken = taken(day, s.slot);
                return (
                  <button key={s.slot} type="button" className="slot" aria-pressed={w.slot === s.slot} disabled={isTaken}
                    onClick={() => set({ slot: s.slot })}>
                    <b>{s.slot}</b><small>{isTaken ? 'Booked' : `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`}</small>
                  </button>
                );
              })}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: '.9rem' }}>
              This is your preferred time. Our office confirms it, usually within one business day.
              {w.priority === 'Emergency' && <> <b style={{ color: 'var(--bad)' }}>For emergencies we'll call you right away.</b></>}
            </p>
          </div>
        )}

        {w.step === 4 && (
          <dl className="summary">
            <dt>Service</dt><dd>{w.category}</dd>
            <dt>Title</dt><dd>{w.title}</dd>
            <dt>Details</dt><dd>{w.desc || '—'}</dd>
            <dt>Address</dt><dd>{w.address}</dd>
            <dt>Urgency</dt><dd>{PRIORITIES.find((p) => p.value === w.priority)?.label}</dd>
            <dt>Preferred time</dt><dd>{day}, {w.slot}</dd>
          </dl>
        )}

        <div className="err" role="alert">{err}</div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn gold" disabled={busy} onClick={() => void next()}>
            {w.step === 4 ? 'Send request' : 'Continue'} <Icon name="arrow" size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
