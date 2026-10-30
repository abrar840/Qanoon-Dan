/**
 * The page the password-reset email links to. With Supabase the link logs
 * the user in with a temporary "recovery" session; we then set the new
 * password with api.resetPassword().
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { Field } from '../components/ui/Field';

export function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== password;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.resetPassword(password);
      toast.show('Password updated.', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not update the password.'));
    } finally {
      setBusy(false);
    }
  }

  if (!loading && !user) {
    return (
      <>
        <h1>Link expired</h1>
        <p className="lead">This reset link is no longer valid. Request a new one and try again.</p>
        <Link to="/forgot-password" className="btn btn-block">
          Request a new link
        </Link>
      </>
    );
  }

  return (
    <>
      <h1>Choose a new password</h1>
      <p className="lead">Use at least 8 characters.</p>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <Field
          label="New password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          label="Confirm new password"
          type="password"
          name="confirm"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? 'Passwords do not match.' : undefined}
        />
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={busy || password.length < 8 || confirm !== password}
        >
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </>
  );
}
