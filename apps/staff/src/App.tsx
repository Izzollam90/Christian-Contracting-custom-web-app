import { useEffect, useState } from 'react';
import {
  useAuth, useMfa, LiquidBackground, Icon, isStaffRole, ROLE_LABEL, COMPANY_NAME, signOut, SignIn, Spinner, MfaChallenge, TwoFactorSettings,
} from '@herkey/shared';
import type { AppRole } from '@herkey/shared';
import { useStaffData } from './useStaffData';
import type { StaffData } from './data';
import Today from './pages/Today';
import Board from './pages/Board';
import MyJobs from './pages/MyJobs';
import Expenses from './pages/Expenses';
import Overview from './pages/Overview';
import JobsAll from './pages/JobsAll';
import Schedule from './pages/Schedule';
import Approvals from './pages/Approvals';
import Billing from './pages/Billing';
import Payroll from './pages/Payroll';
import Team from './pages/Team';
import DataViews from './pages/DataViews';

const NAV: Record<string, [string, string, string][]> = {
  Crew: [['today', 'Today', 'today'], ['board', 'Job board', 'board'], ['mine', 'My jobs', 'jobs'], ['expenses', 'Expenses', 'cash']],
  CrewLead: [['overview', 'Overview', 'overview'], ['jobs', 'Jobs', 'jobs'], ['schedule', 'Schedule', 'cal'], ['approvals', 'Approvals', 'ok'], ['today', 'My clock', 'today']],
  Finance: [['overview', 'Overview', 'overview'], ['billing', 'Estimates & invoices', 'doc'], ['approvals', 'Approvals', 'ok'], ['payroll', 'Time & payroll', 'time']],
  Admin: [['overview', 'Overview', 'overview'], ['jobs', 'Jobs', 'jobs'], ['schedule', 'Schedule', 'cal'], ['billing', 'Billing', 'doc'], ['team', 'Team & access', 'team'], ['data', 'Data tables', 'table']],
};

const ROLE_DESC: Record<AppRole, string> = {
  Crew: 'Your jobs, clock and expenses',
  CrewLead: 'Assign, schedule, approve',
  Finance: 'Billing, spending, payroll',
  Admin: 'Everything, plus access',
  Customer: '',
};

export default function App() {
  const { session, profile, loading } = useAuth();
  const mfa = useMfa();
  const [view, setView] = useState<string>('overview');
  const [show2fa, setShow2fa] = useState(false);
  const needsMfa = !!profile && ['Admin', 'Finance'].includes(profile.role) && mfa?.aal !== 'aal2';

  useEffect(() => {
    if (profile && isStaffRole(profile.role)) {
      const first = (NAV[profile.role] ?? NAV.Crew)![0]![0];
      setView(first);
    }
  }, [profile?.role]);

  if (loading) {
    return <div className="app"><LiquidBackground /><main className="wrap"><Spinner /></main></div>;
  }
  if (!session || !profile) {
    return <><LiquidBackground /><SignIn subtitle="Crew & office" /></>;
  }
  if (needsMfa) {
    return <div className="app"><LiquidBackground /><main className="wrap" style={{ paddingBlock: '14vh' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}><MfaChallenge /></div>
    </main></div>;
  }
  if (!isStaffRole(profile.role)) {
    return (
      <div className="app">
        <LiquidBackground />
        <main className="wrap" style={{ paddingBlock: '20vh' }}>
          <div className="glass pad stack" style={{ maxWidth: 460, margin: '0 auto' }}>
            <h2>Staff access required</h2>
            <p className="muted">Your account ({profile.email}) doesn't have staff access yet. Ask an admin to assign your role from Team & access.</p>
            <div><button className="btn" onClick={() => void signOut()}>Sign out</button></div>
          </div>
        </main>
      </div>
    );
  }

  return <StaffShell profileRole={profile.role} profileName={profile.full_name ?? profile.email} view={view} setView={setView} show2fa={show2fa} setShow2fa={setShow2fa} />;
}

function StaffShell({ profileRole, profileName, view, setView, show2fa, setShow2fa }: {
  profileRole: AppRole; profileName: string; view: string; setView: (v: string) => void;
  show2fa: boolean; setShow2fa: (v: boolean) => void;
}) {
  const { data, loading, reload } = useStaffData();
  const nav = NAV[profileRole] ?? NAV.Crew!;
  const counts = {
    board: data.board.length,
    mine: data.jobs.filter((j) => j.crew_id && !['Completed', 'Canceled'].includes(j.status)).length,
    approvals: data.expenses.filter((e) => e.status === 'Submitted').length + data.time.filter((t) => t.review === 'Needs Review').length,
    jobs: data.board.length,
  };

  type PageProps = { data: StaffData; reload: () => Promise<void> };
  const pages: Record<string, (p: PageProps) => JSX.Element> = {
    today: (p) => <Today {...p} />,
    board: (p) => <Board {...p} />,
    mine: (p) => <MyJobs {...p} />,
    expenses: (p) => <Expenses {...p} />,
    overview: (p) => <Overview {...p} />,
    jobs: (p) => <JobsAll {...p} />,
    schedule: (p) => <Schedule {...p} />,
    approvals: (p) => <Approvals {...p} />,
    billing: (p) => <Billing {...p} />,
    payroll: (p) => <Payroll {...p} />,
    team: (p) => <Team {...p} />,
    data: (p) => <DataViews {...p} />,
  };
  const Page = pages[view] ?? ((p) => <Overview {...p} />);

  return (
    <div className="app">
      <LiquidBackground />
      <div className="shell">
        <aside className="rail">
          <div className="role">
            <div className="eyebrow">{ROLE_LABEL[profileRole]}</div>
            <b>{profileName}</b>
            <small>{ROLE_DESC[profileRole]}</small>
          </div>
          {nav.map(([k, label, ic]) => (
            <button key={k} type="button" className="nb" aria-current={view === k ? 'page' : undefined} onClick={() => setView(k)}>
              <Icon name={ic} size={20} />
              <span className="l">{label}</span>
              {counts[k as keyof typeof counts] ? <span className="ct">{counts[k as keyof typeof counts]}</span> : null}
            </button>
          ))}
          <button type="button" className="nb" style={{ marginTop: 'auto' }} onClick={() => setShow2fa(true)}>
            <Icon name="lock" size={20} /><span className="l">Two-factor auth</span>
          </button>
          <button type="button" className="nb" onClick={() => void signOut()}>
            <Icon name="logout" size={20} /><span className="l">Sign out</span>
          </button>
        </aside>
        <main className="wrap" style={{ paddingBlock: 28 }}>
          <div className="row" style={{ marginBottom: 16 }}>
            <span className="mono" style={{ width: 34, height: 34, fontSize: '.8rem' }}>HM</span>
            <b style={{ fontFamily: 'var(--serif)' }}>{COMPANY_NAME}</b>
            <span className="muted">Crew & office</span>
          </div>
          {loading ? <Spinner /> : <Page data={data} reload={reload} />}
        </main>
      </div>
      {show2fa && <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) setShow2fa(false); }}>
        <div className="drawer" style={{ width: 'min(480px,100%)' }}><TwoFactorSettings /><div className="row"><button className="btn sm" onClick={() => setShow2fa(false)}>Close</button></div></div>
      </div>}
    </div>
  );
}
