/** Centred card layout for login / sign up / password pages (no sidebar). */
import { Link, Outlet } from 'react-router-dom';
import { COPY } from '../../config/examples';

export function AuthLayout() {
  return (
    <div className="auth-layout">
      <Link to="/" className="brand" aria-label={`${COPY.appName} home`}>
        <span className="brand-mark" aria-hidden="true">
          Q
        </span>
        <span>{COPY.appName}</span>
      </Link>
      <main className="auth-card card">
        <Outlet />
      </main>
      <p className="legal-footer" style={{ marginTop: 'auto' }}>
        {COPY.disclaimer} {COPY.scope}
      </p>
    </div>
  );
}
