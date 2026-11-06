import { useState } from 'react';
import {
  GEOFENCE_METERS, Pill, checkGeofence, hoursBetween, fmtDT, fmtTime, Icon,
} from '@herkey/shared';
import type { StaffData } from '../data';
import { clockIn, clockOut } from '../data';

export default function Today({ data, reload }: { data: StaffData; reload: () => Promise<void> }) {
  const { time, jobs, customers } = data;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  const openShift = time.find((t) => !t.clock_out);
  const openJob = openShift?.job_id ? jobs.find((j) => j.id === openShift.job_id) : null;
  const siteCustomer = openJob ? customers.find((c) => c.id === openJob.customer_id) : null;

  const doClockIn = async (jobId: string | null) => {
    setBusy(true); setErr(''); setInfo('');
    try {
      const job = jobId ? jobs.find((j) => j.id === jobId) : null;
      const cust = job ? customers.find((c) => c.id === job.customer_id) : null;
      const geo = await checkGeofence(cust?.latitude ?? null, cust?.longitude ?? null, GEOFENCE_METERS);
      await clockIn(jobId, cust?.id ?? null, geo);
      setInfo(geo.locationCheck === 'Within geofence'
        ? `Clocked in ${geo.distanceMeters} m from the site — within the geofence.`
        : geo.locationCheck === 'Outside geofence'
          ? `Clocked in ${geo.distanceMeters} m from the site — outside the ${GEOFENCE_METERS} m geofence, flagged Needs Review.`
          : 'Clocked in. Location not checked (permission denied or no site pin).');
      await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const doClockOut = async () => {
    if (!openShift) return;
    setBusy(true); setErr('');
    try { await clockOut(openShift.id); await reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const myJobs = jobs.filter((j) => j.crew_id && !['Completed', 'Canceled'].includes(j.status));
  const todayEntries = time.slice(0, 8);

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">Today</div>
          <h2>{openShift ? 'You are clocked in' : 'Clock in to start'}</h2>
          <p>Location is checked against the job site (supporting evidence only — {GEOFENCE_METERS} m geofence).</p>
        </div>
      </div>

      <div className="glass pad">
        {openShift ? (
          <div className="stack">
            <div className="row">
              <Pill status={openShift.review === 'Needs Review' ? 'Needs Review' : 'Open'} />
              <span className="muted">since {fmtTime(openShift.clock_in)} · {hoursBetween(openShift.clock_in, null).toFixed(1)} h so far</span>
              {openShift.location_check && <span className="muted">{openShift.location_check}{openShift.distance_meters != null ? ` · ${openShift.distance_meters} m` : ''}</span>}
            </div>
            {openJob && <div className="muted">Against job <b style={{ color: 'var(--text)' }}>{openJob.id}</b> — {openJob.title}</div>}
            <div className="row">
              <button className="btn gold" disabled={busy} onClick={() => void doClockOut()}>Clock out</button>
            </div>
          </div>
        ) : (
          <div className="stack">
            <div className="row"><span className="muted">Clock in against a job (optional):</span></div>
            <div className="row">
              <button className="btn" disabled={busy} onClick={() => void doClockIn(null)}>Just clock in</button>
              {myJobs.map((j) => (
                <button key={j.id} className="btn" disabled={busy} onClick={() => void doClockIn(j.id)}>{j.id} · {j.title}</button>
              ))}
            </div>
          </div>
        )}
        {err && <div className="err" role="alert">{err}</div>}
        {info && <div style={{ color: 'var(--ok)' }} role="status">{info}</div>}
      </div>

      <div className="glass pad stack">
        <h3>Recent time entries</h3>
        <div className="tablewrap">
          <table>
            <thead><tr><th>In</th><th>Out</th><th>Job</th><th className="n">Hours</th><th>Location</th><th>Review</th></tr></thead>
            <tbody>
              {todayEntries.map((t) => (
                <tr key={t.id}>
                  <td>{fmtDT(t.clock_in)}</td>
                  <td>{t.clock_out ? fmtDT(t.clock_out) : '—'}</td>
                  <td>{t.job_id ?? '—'}</td>
                  <td className="n">{hoursBetween(t.clock_in, t.clock_out).toFixed(2)}</td>
                  <td>{t.location_check ?? '—'}{t.distance_meters != null ? ` (${t.distance_meters} m)` : ''}</td>
                  <td><Pill status={t.review} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Icon name="pin" size={16} /> Site check uses your phone's location at clock-in only.
      </div>
    </div>
  );
}
