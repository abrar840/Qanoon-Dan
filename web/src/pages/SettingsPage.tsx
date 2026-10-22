/**
 * Settings: theme, answer length, show sources, and the danger zone
 * (delete all conversations, delete account). Works for guests too, except
 * the danger zone which needs an account.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorMessage, type AnswerLength, type Theme } from '../api';
import { useAuth } from '../state/AuthContext';
import { useConversations } from '../state/ConversationsContext';
import { useSettings } from '../state/SettingsContext';
import { useToast } from '../state/ToastContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const THEMES: { value: Theme; label: string; desc: string }[] = [
  { value: 'system', label: 'Match my phone', desc: 'Follows the system light/dark setting.' },
  { value: 'light', label: 'Light', desc: 'Always light.' },
  { value: 'dark', label: 'Dark', desc: 'Always dark. Easier on the eyes at night.' },
];

const LENGTHS: { value: AnswerLength; label: string; desc: string }[] = [
  { value: 'short', label: 'Short', desc: 'One or two sentences with the section number.' },
  { value: 'normal', label: 'Normal', desc: 'A short paragraph. Recommended.' },
  { value: 'detailed', label: 'Detailed', desc: 'More context on how the law is applied.' },
];

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const { settings, update } = useSettings();
  const { removeAll } = useConversations();
  const toast = useToast();
  const navigate = useNavigate();

  const [confirm, setConfirm] = useState<'data' | 'account' | null>(null);
  const [busy, setBusy] = useState(false);

  async function deleteData() {
    setBusy(true);
    try {
      await removeAll();
      toast.show('All conversations deleted.', 'success');
      setConfirm(null);
      navigate('/');
    } catch (err) {
      toast.show(errorMessage(err, 'Could not delete.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      await api.deleteAccount();
      setUser(null);
      toast.show('Your account has been deleted.', 'success');
      setConfirm(null);
      navigate('/');
    } catch (err) {
      toast.show(errorMessage(err, 'Could not delete the account.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Settings</h1>
        <p>{user ? 'Saved to your account and applied on every device.' : 'Saved on this device only.'}</p>
      </header>

      <section className="section">
        <h2 id="theme-label">Appearance</h2>
        <div className="choice-group" role="radiogroup" aria-labelledby="theme-label">
          {THEMES.map((t) => (
            <label key={t.value} className="choice">
              <input
                type="radio"
                name="theme"
                value={t.value}
                checked={settings.theme === t.value}
                onChange={() => void update({ theme: t.value })}
              />
              <span>
                {t.label}
                <span className="choice-desc">{t.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 id="length-label">Answer length</h2>
        <div className="choice-group" role="radiogroup" aria-labelledby="length-label">
          {LENGTHS.map((l) => (
            <label key={l.value} className="choice">
              <input
                type="radio"
                name="answer_length"
                value={l.value}
                checked={settings.answer_length === l.value}
                onChange={() => void update({ answer_length: l.value })}
              />
              <span>
                {l.label}
                <span className="choice-desc">{l.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Sources</h2>
        <label className="choice">
          <input
            type="checkbox"
            checked={settings.show_sources}
            onChange={(e) => void update({ show_sources: e.target.checked })}
          />
          <span>
            Show cited sections under each answer
            <span className="choice-desc">Turn off for a shorter screen. The answer text still names the sections.</span>
          </span>
        </label>
      </section>

      <section className="section card danger-zone">
        <h2>Your data</h2>
        {user ? (
          <>
            <p className="section-desc">
              Deleting removes your data from QanoonDaan permanently. Neither action can be undone.
            </p>
            <div className="row">
              <button type="button" className="btn btn-danger" onClick={() => setConfirm('data')}>
                Delete all conversations
              </button>
              <button type="button" className="btn btn-danger" onClick={() => setConfirm('account')}>
                Delete my account
              </button>
            </div>
          </>
        ) : (
          <p className="section-desc">
            As a guest nothing is stored on our servers. Your theme choice stays in this browser only.{' '}
            <Link to="/login">Log in</Link> to manage account data.
          </p>
        )}
      </section>

      <ConfirmDialog
        open={confirm === 'data'}
        title="Delete all conversations?"
        confirmLabel="Delete everything"
        danger
        busy={busy}
        onConfirm={deleteData}
        onCancel={() => setConfirm(null)}
      >
        Every saved question and answer will be removed. Your account and settings stay.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'account'}
        title="Delete your account?"
        confirmLabel="Delete my account"
        danger
        busy={busy}
        onConfirm={deleteAccount}
        onCancel={() => setConfirm(null)}
      >
        Your profile, settings, conversations and feedback will all be deleted. You will be logged out.
      </ConfirmDialog>
    </div>
  );
}
