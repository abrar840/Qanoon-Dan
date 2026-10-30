import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage, USE_MOCK } from '../api';
import { useAuth } from '../state/AuthContext';
import { Field } from '../components/ui/Field';

export function LoginPage() {
  const { user, loading, logIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already logged in? Nothing to do here.
  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await logIn({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not log in.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Log in</h1>
      <p className="lead">Keep your questions and answers in one place.</p>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email || !password}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div className="auth-links">
        <Link to="/forgot-password">Forgot your password?</Link>
        <span>
          New here? <Link to="/signup">Create an account</Link>
        </span>
        <span>
          Or <Link to="/">continue as a guest</Link> (history is not saved).
        </span>
        {USE_MOCK && (
          <span className="small">
            Mock mode: try <strong>demo@qanoondaan.pk</strong> / <strong>demo1234</strong>, or any email with a
            password of 8+ characters.
          </span>
        )}
      </div>
    </>
  );
}
