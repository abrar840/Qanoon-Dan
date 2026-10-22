import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="notfound">
      <div>
        <div className="code" aria-hidden="true">
          404
        </div>
        <h1>Page not found</h1>
        <p className="muted" style={{ margin: '8px 0 24px' }}>
          The link may be old or mistyped.
        </p>
        <Link to="/" className="btn btn-primary">
          Go to QanoonDaan
        </Link>
      </div>
    </main>
  );
}
