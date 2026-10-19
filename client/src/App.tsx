import { useEffect, useState } from 'react';
import { BookPage } from './pages/BookPage';
import { HostPage } from './pages/HostPage';

const routes = {
  '#/': { long: 'Book a session', short: 'Book' },
  '#/instructor': { long: 'Instructor view', short: 'Instructor' },
} as const;
type Route = keyof typeof routes;

const currentRoute = (): Route => (location.hash === '#/instructor' ? '#/instructor' : '#/');

export default function App() {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </span>
          TeamLift <span className="brand-sub">Sessions</span>
        </a>
        <nav className="tabs">
          {(Object.keys(routes) as Route[]).map((r) => (
            <a key={r} href={r} aria-current={route === r ? 'page' : undefined}>
              <span className="tab-long">{routes[r].long}</span>
              <span className="tab-short">{routes[r].short}</span>
            </a>
          ))}
        </nav>
      </header>
      <main>{route === '#/instructor' ? <HostPage /> : <BookPage />}</main>
    </>
  );
}
