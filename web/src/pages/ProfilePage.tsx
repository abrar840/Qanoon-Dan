/** Profile: avatar upload, display name, email (read-only), member since. */
import { useRef, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { Avatar } from '../components/ui/Avatar';
import { Field } from '../components/ui/Field';
import { fullDateTime } from '../utils/format';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null; // RequireAuth guarantees a user; this keeps TS happy.

  const dirty = name.trim() !== user.name;

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await api.updateProfile({ name: name.trim() });
      setUser(updated);
      toast.show('Profile saved.', 'success');
    } catch (err) {
      setError(errorMessage(err, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  }

  async function onFileChosen(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const { avatar_url } = await api.uploadAvatar(file);
      const updated = await api.updateProfile({ avatar_url });
      setUser(updated);
      toast.show('Photo updated.', 'success');
    } catch (err) {
      setError(errorMessage(err, 'Could not upload the photo.'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removePhoto() {
    setError(null);
    setUploading(true);
    try {
      const updated = await api.updateProfile({ avatar_url: null });
      setUser(updated);
      toast.show('Photo removed.');
    } catch (err) {
      setError(errorMessage(err, 'Could not remove the photo.'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Profile</h1>
        <p>How you appear in QanoonDaan.</p>
      </header>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <section className="card section">
        <div className="row">
          <Avatar user={user} large />
          <div className="row">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              id="avatar-file"
              onChange={(e) => void onFileChosen(e.target.files?.[0])}
            />
            <label htmlFor="avatar-file" className="btn btn-sm" aria-disabled={uploading}>
              {uploading ? 'Uploading…' : 'Change photo'}
            </label>
            {user.avatar_url && (
              <button type="button" className="btn btn-sm btn-ghost" onClick={removePhoto} disabled={uploading}>
                Remove
              </button>
            )}
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          JPG or PNG, up to 1 MB.
        </p>
      </section>

      <form className="card section" onSubmit={onSave}>
        <Field label="Name" name="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Field
          label="Email"
          type="email"
          name="email"
          value={user.email}
          readOnly
          hint="Email cannot be changed here. Contact support if you need to."
        />
        <div className="row row-between">
          <span className="small muted">Member since {fullDateTime(user.created_at)}</span>
          <button type="submit" className="btn btn-primary" disabled={!dirty || saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
