import { useState } from 'react';
import { Pill, Icon, categoryIcon, fmtDay } from '@herkey/shared';
import type { StaffData } from '../data';
import { claimJob } from '../data';

const PR_ORDER: Record<string, number> = { Emergency: 0, Soon: 1, Routine: 2 };

export default function Board({ data, reload }: { data: StaffData; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const board = [...data.board].sort(
    (a, b) => (PR_ORDER[a.priority] ?? 2) - (PR_ORDER[b.priority] ?? 2) || +new Date(a.created_at) - +new Date(b.created_at)
  );

  const claim = async (jobId: string) => {
    setBusy(jobId); setErr('');
    try { await claimJob(jobId); await reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); await reload(); }
    finally { setBusy(null); }
  };

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">Job board</div>
          <h2>Open requests</h2>
          <p>Before you claim: street name only — the customer's name and exact address appear after you claim.</p>
        </div>
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      <div className="glass list">
        {board.length ? board.map((j) => (
          <div key={j.id} className="jr" style={{ cursor: 'default' }}>
            <span className="ic"><Icon name={categoryIcon(j.category)} size={22} /></span>
            <span>
              <span className="t">{j.title}</span>
              <span className="s"><span className="mono">{j.id}</span> · {j.street_name ?? '—'} (exact address after claim) · {j.preferred_date ? fmtDay(j.preferred_date) : 'no date'}{j.time_slot ? `, ${j.time_slot}` : ''}</span>
            </span>
            <span className="e">
              <Pill status={j.priority} />
              <button className="btn gold sm" disabled={busy === j.id} onClick={() => void claim(j.id)}>
                {busy === j.id ? 'Claiming…' : 'Claim'}
              </button>
            </span>
          </div>
        )) : <div className="empty">Nothing open. New customer requests appear here live.</div>}
      </div>
    </div>
  );
}
