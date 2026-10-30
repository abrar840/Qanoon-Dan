import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api';
import { useAuth } from '../state/AuthContext';
import { Field } from '../components/ui/Field';

export function SignUpPage() {
  const { user, loading, signUp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = name.trim() && email.trim() && password.length >= 8 && confirm === password && !busy;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await signUp({ name: name.trim(), email: email.trim(), password });
      if (result.needs_email_confirmation) {
        setCheckEmail(true);
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not create the account.'));
    } finally {
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <>
        <h1>Check your email</h1>
        <p className="lead">
          We sent a confirmation link to <strong>{email}</strong>. Open it to finish creating your account, then
          come back and log in.
        </p>
        <Link to="/login" className="btn btn-block">
          Go to log in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1>Create an account</h1>
      <p className="lead">Free. Saves your conversations so you can come back to them.</p>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Your name"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          label="Confirm password"
          type="password"
          name="confirm"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? 'Passwords do not match.' : undefined}
        />
        <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <div className="auth-links">
        <span>
          Already have an account? <Link to="/login">Log in</Link>
        </span>
        <span className="small">
          By signing up you agree that QanoonDaan gives legal information, not legal advice.
        </span>
      </div>
    </>
  );
}
