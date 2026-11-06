import { useState } from 'react';
import { Pill, ROLE_LABEL, useAuth } from '@herkey/shared';
import type { StaffData } from '../data';
import type { AppRole } from '@herkey/shared';
import { setProfileRole, inviteStaff } from '../data';

const STAFF_ROLES: AppRole[] = ['Customer', 'Crew', 'CrewLead', 'Finance', 'Admin'];

export default function Team({ data, reload }: { data: StaffData; reload: () => Promise<void> }) {
  const { profile } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const changeRole = async (id: string, role: AppRole) => {
    setBusy(true); setErr('');
    try { await setProfileRole(id, role); setMsg(`Role updated to ${ROLE_LABEL[role]}.`); await reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const invite = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      await inviteStaff(inviteEmail.trim());
      setMsg(`Invite email sent to ${inviteEmail.trim()}. After they sign in, set their role below.`);
      setInviteEmail('');
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">Team & access</div>
          <h2>People and roles</h2>
          <p>Admin only. New sign-ups start as Customer; assign staff roles here. Nobody can change their own role (enforced in the database).</p>
        </div>
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      {msg && <div style={{ color: 'var(--ok)' }} role="status">{msg}</div>}

      {profile?.role === 'Admin' && (
        <div className="glass pad stack">
          <h3>Invite a staff member by email</h3>
          <div className="inline-form">
            <label>Email<input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="newcrew@example.com" /></label>
            <button className="btn gold" disabled={busy || !inviteEmail} onClick={() => void invite()}>Send invite</button>
          </div>
        </div>
      )}

      <div className="glass pad stack">
        <h3>Everyone</h3>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th className="n">Rate</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {data.profiles.map((p) => (
                <tr key={p.id}>
                  <td>{p.full_name ?? '—'}</td>
                  <td className="muted">{p.email}</td>
                  <td className="muted">{p.phone ?? '—'}</td>
                  <td><Pill status={p.active ? ROLE_LABEL[p.role] : 'Inactive'} /></td>
                  <td className="n">{p.hourly_rate_cents ? `$${(p.hourly_rate_cents / 100).toFixed(2)}/h` : '—'}</td>
                  <td>{p.active ? 'Yes' : 'No'}</td>
                  <td>
                    {profile?.role === 'Admin' && p.id !== profile.id && (
                      <select value={p.role} disabled={busy} onChange={(e) => void changeRole(p.id, e.target.value as AppRole)}>
                        {STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
