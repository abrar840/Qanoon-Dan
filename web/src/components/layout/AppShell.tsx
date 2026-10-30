/**
 * The frame around every main screen: top bar, sidebar (drawer on mobile),
 * and the page content via <Outlet />.
 *
 * The sidebar is always rendered (desktop column / mobile drawer). For
 * guests it shows a "log in to save history" message instead of the list.
 */
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { DESKTOP_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const location = useLocation();

  // Close the drawer when the route changes (user tapped a conversation).
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock page scroll while the drawer is open on mobile.
  useEffect(() => {
    if (isDesktop) return;
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen, isDesktop]);

  return (
    <div className="shell with-sidebar">
      <a href="#question" className="skip-link">
        Skip to question box
      </a>
      <Sidebar open={drawerOpen || isDesktop} onClose={() => setDrawerOpen(false)} />
      <TopBar onMenu={() => setDrawerOpen(true)} />
      <main className="main" id="main">
        <Outlet />
      </main>
    </div>
  );
}
