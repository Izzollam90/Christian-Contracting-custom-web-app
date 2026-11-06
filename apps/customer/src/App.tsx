import { useEffect, useState } from 'react';
import { useAuth, LiquidBackground, Icon, initials, COMPANY_NAME, signOut, SignIn, PasskeyButton } from '@herkey/shared';
import Home from './Home';
import Request from './Request';
import JobsPage from './Jobs';
import Billing from './Billing';

const ROUTES = [
  ['home', 'Home', 'overview'],
  ['request', 'Request service', 'plus'],
  ['jobs', 'My jobs', 'jobs'],
  ['billing', 'Billing', 'doc'],
] as const;

type Route = (typeof ROUTES)[number][0];
type Go = (r: Route) => void;

const routeFromHash = (): Route => {
  const h = window.location.hash.slice(1);
  return (ROUTES.some((r) => r[0] === h) ? h : 'home') as Route;
};

export default function App() {
  const { session, profile, loading } = useAuth();
  const [route, setRoute] = useState<Route>(routeFromHash);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (r: Route) => {
    window.location.hash = r;
    window.scrollTo({ top: 0 });
  };

  if (loading) {
    return <div className="app"><LiquidBackground /><main className="wrap"><div className="spinner" /></main></div>;
  }
  if (!session || !profile) {
    return <><LiquidBackground /><SignIn subtitle="Customer portal" /></>;
  }

  const pages: Record<Route, (p: { go: Go }) => JSX.Element> = {
    home: Home,
    request: Request,
    jobs: JobsPage,
    billing: Billing,
  };
  const Page = pages[route] ?? Home;

  return (
    <div className="app">
      <LiquidBackground />
      <header className="nav">
        <div className="wrap">
          <a className="brand" href="#home" aria-label={`${COMPANY_NAME}, home`}>
            <span className="mono">HM</span>
            <span className="wordmark"><b>Herkey</b><small>Maintenance</small></span>
          </a>
          <nav className="links" aria-label="Main">
            {ROUTES.map(([k, label]) => (
              <button key={k} type="button" aria-current={route === k ? 'page' : undefined} onClick={() => go(k)}>{label}</button>
            ))}
          </nav>
          <div className="me" title={profile.email}>
            <i>{initials(profile.full_name ?? profile.email)}</i>
            <span>{profile.full_name ?? profile.email}</span>
            <PasskeyButton />
            <button className="btn ghost sm" onClick={() => void signOut()} aria-label="Sign out"><Icon name="logout" size={16} /></button>
          </div>
        </div>
      </header>
      <main><Page key={route} go={go as Go} /></main>
      <footer>
        <div className="wrap">
          <span>{COMPANY_NAME} · Repairs, upkeep and property care</span>
          <span className="muted">Lancaster, PA</span>
        </div>
      </footer>
      <nav className="tabbar" aria-label="Main">
        {ROUTES.map(([k, label, ic]) => k === 'request' ? (
          <button key={k} type="button" className="fab" aria-current={route === k ? 'page' : undefined} onClick={() => go(k)}>
            <span className="ic"><Icon name={ic} size={22} sw={2.4} /></span><small>Request</small>
          </button>
        ) : (
          <button key={k} type="button" aria-current={route === k ? 'page' : undefined} onClick={() => go(k)}>
            <Icon name={ic} size={22} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

