import { useEffect, useState } from 'react';
import {
  useAuth, useAal2, LiquidBackground, Icon, isStaffRole, ROLE_LABEL, COMPANY_NAME, signOut, SignIn, Spinner, PasskeyButton,
  SecurityPage, Aal2Gate, PasskeyNudge,
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
import Privacy from './pages/Privacy';

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

const REQUIRES_AAL2: AppRole[] = ['Admin', 'Finance'];

export default function App() {
  const { session, profile, loading } = useAuth();
  const { aal2, refresh: refreshAal2, loading: aalLoading } = useAal2();
  const [view, setView] = useState<string>('overview');
  const [showNudge, setShowNudge] = useState(false);

  useEffect(() => {
    if (profile && isStaffRole(profile.role)) {
      const first = (NAV[profile.role] ?? NAV.Crew)![0]![0];
      setView(first);
    }
  }, [profile?.role]);

  useEffect(() => {
    if (session && profile) {
      const dismissed = localStorage.getItem('passkey_nudge_dismissed');
      if (!dismissed) setShowNudge(true);
    }
  }, [session, profile?.id]);

  if (loading) {
    return <div className="app"><LiquidBackground /><main className="wrap"><Spinner /></main></div>;
  }
  if (!session || !profile) {
    return <><LiquidBackground /><SignIn subtitle="Crew & office" /></>;
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

  const needsAal2 = REQUIRES_AAL2.includes(profile.role);
  const dismissNudge = () => { setShowNudge(false); localStorage.setItem('passkey_nudge_dismissed', '1'); };

  if (needsAal2) {
    return (
      <div className="app">
        <LiquidBackground />
        <main className="wrap" style={{ paddingBlock: '10vh' }}>
          <Aal2Gate aal2={aal2} loading={aalLoading}>
            <StaffShell profileRole={profile.role} profileName={profile.full_name ?? profile.email} view={view} setView={setView} aal2={aal2} refreshAal2={refreshAal2} showNudge={showNudge} dismissNudge={dismissNudge} />
          </Aal2Gate>
        </main>
      </div>
    );
  }

  return <StaffShell profileRole={profile.role} profileName={profile.full_name ?? profile.email} view={view} setView={setView} aal2={aal2} refreshAal2={refreshAal2} showNudge={showNudge} dismissNudge={dismissNudge} />;
}

function StaffShell({ profileRole, profileName, view, setView, aal2, refreshAal2, showNudge, dismissNudge }: {
  profileRole: AppRole; profileName: string; view: string; setView: (v: string) => void;
  aal2: boolean; refreshAal2: () => Promise<void>; showNudge: boolean; dismissNudge: () => void;
}) {
  const { data, loading, reload } = useStaffData();
  const nav = NAV[profileRole] ?? NAV.Crew!;
  const fullNav = [...nav, ['security', 'Security', 'shield'] as [string, string, string], ['privacy', 'Privacy', 'lock'] as [string, string, string]];
  const counts = {
    board: data.board.length,
    mine: data.jobs.filter((j) => j.crew_id && !['Completed', 'Canceled'].includes(j.status)).length,
    approvals: data.expenses.filter((e) => e.status === 'Submitted').length + data.time.filter((t) => t.review === 'Needs Review').length,
    jobs: data.board.length,
  };

  type PageProps = { data: StaffData; reload: () => Promise<void>; aal2: boolean; refreshAal2: () => Promise<void> };
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
    security: () => <SecurityPage aal2={aal2} refreshAal2={refreshAal2} />,
    privacy: () => <Privacy />,
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
          {fullNav.map(([k, label, ic]) => (
            <button key={k} type="button" className="nb" aria-current={view === k ? 'page' : undefined} onClick={() => setView(k)}>
              <Icon name={ic} size={20} />
              <span className="l">{label}</span>
              {counts[k as keyof typeof counts] ? <span className="ct">{counts[k as keyof typeof counts]}</span> : null}
            </button>
          ))}
          <div style={{ marginTop: 'auto', padding: '6px 10px' }}><PasskeyButton /></div>
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
          {showNudge && view === 'overview' && <PasskeyNudge onDismiss={dismissNudge} />}
          {loading ? <Spinner /> : <Page data={data} reload={reload} aal2={aal2} refreshAal2={refreshAal2} />}
        </main>
      </div>
    </div>
  );
}
