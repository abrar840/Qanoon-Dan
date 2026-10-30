import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { Field } from '../components/ui/Field';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, 'Could not send the email.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Reset your password</h1>
      <p className="lead">Enter your email and we will send you a link to choose a new password.</p>

      {sent && (
        <div className="form-success" role="status">
          If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your spam folder
          too.
        </div>
      )}
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {!sent && (
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
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <div className="auth-links">
        <Link to="/login">Back to log in</Link>
      </div>
    </>
  );
}
