import { useState } from 'react';
import { friendlyError } from '@herkey/shared';
import { Pill, ROLE_LABEL, useAuth, useStepUp } from '@herkey/shared';
import type { StaffData } from '../data';
import type { AppRole } from '@herkey/shared';
import { setProfileRole } from '../data';

const STAFF_ROLES: AppRole[] = ['Customer', 'Crew', 'CrewLead', 'Finance', 'Admin'];

export default function Team({ data, reload, aal2, refreshAal2 }: { data: StaffData; reload: () => Promise<void>; aal2: boolean; refreshAal2: () => Promise<void> }) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const { requireStepUp, StepUpModal } = useStepUp(aal2, refreshAal2);

  const changeRole = async (id: string, role: AppRole) => {
    setBusy(true); setErr('');
    try {
      await requireStepUp(async () => {
        await setProfileRole(id, role);
        setMsg(`Role updated to ${ROLE_LABEL[role]}.`);
        await reload();
      });
    } catch (e) { setErr(friendlyError(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <div className="head">
        <div>
          <div className="eyebrow">Team & access</div>
          <h2>People and roles</h2>
          <p>Admin only. New sign-ups start as Customer; assign staff roles here. Nobody can change their own role (enforced in the database). Role changes require 2FA.</p>
        </div>
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      {msg && <div style={{ color: 'var(--ok)' }} role="status">{msg}</div>}

      {profile?.role === 'Admin' && (
        <div className="glass pad stack">
          <h3>Adding a staff member</h3>
          <p>
            Ask the person to open the app and sign in with Google (or set up a passkey). They start
            as a Customer. Once their name appears in the list below, change their role here.
          </p>
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
      {StepUpModal}
    </div>
  );
}
