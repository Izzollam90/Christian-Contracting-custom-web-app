import { nextWorkdays, weekdayShort, dayNum, monthShort, Pill } from '@herkey/shared';
import type { StaffData } from '../data';

export default function Schedule({ data }: { data: StaffData; reload: () => Promise<void> }) {
  const days = nextWorkdays(5);
  const scheduled = data.jobs.filter((j) => j.preferred_date && !['Completed', 'Canceled'].includes(j.status));

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">Schedule</div>
          <h2>Week board</h2>
          <p>Preferred times are confirmed by the office. Crew Lead and Admin assign crew and confirm slots.</p>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))' }}>
        {days.map((d) => {
          const todays = scheduled.filter((j) => j.preferred_date === d);
          return (
            <div key={d} className="glass pad stack">
              <div>
                <div className="eyebrow">{weekdayShort(d)}</div>
                <div className="big">{dayNum(d)} <span className="muted" style={{ fontSize: '.9rem' }}>{monthShort(d)}</span></div>
              </div>
              {todays.length ? todays.map((j) => {
                const crew = j.crew_id ? data.profiles.find((p) => p.id === j.crew_id) : null;
                return (
                  <div key={j.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <b style={{ fontFamily: 'var(--display)' }}>{j.time_slot ?? '—'}</b>
                      <Pill status={j.status} />
                    </div>
                    <div className="muted" style={{ fontSize: '.85rem' }}>{j.id} · {j.title}</div>
                    <div className="muted" style={{ fontSize: '.8rem' }}>{crew?.full_name ?? 'Unassigned'}</div>
                  </div>
                );
              }) : <div className="muted" style={{ fontSize: '.85rem' }}>Nothing scheduled.</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
