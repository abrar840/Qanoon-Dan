/**
 * Conversation history sidebar. On mobile it is a drawer (see layout.css).
 *
 *  - New chat button
 *  - List grouped by day, with rename (inline input) and delete (confirm)
 *  - Guests see a short "log in to save history" note instead
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { useConversations } from '../../state/ConversationsContext';
import { useToast } from '../../state/ToastContext';
import { errorMessage, type Conversation } from '../../api';
import { friendlyDate } from '../../utils/format';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { CheckIcon, CloseIcon, EditIcon, PlusIcon, TrashIcon } from '../ui/Icons';
import { COPY } from '../../config/examples';

export function Sidebar({ open, onClose }: { open: boolean; onClose(): void }) {
  const { user } = useAuth();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move focus into the drawer when it opens, so keyboard users land inside.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <nav className={open ? 'sidebar open' : 'sidebar'} aria-label="Conversation history" aria-hidden={!open}>
        <div className="sidebar-head">
          <strong>History</strong>
          <button ref={closeRef} type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>

        <div className="sidebar-body">
          <Link to="/" className="btn btn-block new-chat">
            <PlusIcon width={18} height={18} /> New chat
          </Link>

          {user ? <ConversationList /> : <GuestNote />}
        </div>

        <div className="sidebar-foot">
          <Link to="/settings">Settings</Link>
          <Link to="/about">About and safety</Link>
          <div style={{ marginTop: 8 }}>{COPY.disclaimer}</div>
        </div>
      </nav>
    </>
  );
}

function GuestNote() {
  return (
    <div className="sidebar-empty">
      <p>You are asking as a guest. Your questions are not saved.</p>
      <p style={{ marginTop: 8 }}>
        <Link to="/login">Log in</Link> or <Link to="/signup">create an account</Link> to keep your history on
        every device.
      </p>
    </div>
  );
}

function ConversationList() {
  const { conversations, loading, error, rename, remove } = useConversations();
  const { id: activeId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Conversation | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading && conversations.length === 0) return <div className="sidebar-empty">Loading…</div>;
  if (error) return <div className="sidebar-empty">{error}</div>;
  if (conversations.length === 0) {
    return <div className="sidebar-empty">No conversations yet. Ask your first question.</div>;
  }

  // Group by "Today" / "Yesterday" / date, preserving the newest-first order.
  const groups: { label: string; items: Conversation[] }[] = [];
  for (const c of conversations) {
    const label = friendlyDate(c.updated_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(c);
    else groups.push({ label, items: [c] });
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await remove(deleting.id);
      toast.show('Conversation deleted.');
      if (deleting.id === activeId) navigate('/');
    } catch (err) {
      toast.show(errorMessage(err, 'Could not delete.'), 'error');
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  return (
    <>
      {groups.map((g) => (
        <div key={g.label}>
          <div className="conv-group-label">{g.label}</div>
          <ul>
            {g.items.map((c) => (
              <li key={c.id} className={c.id === activeId ? 'conv-item active' : 'conv-item'}>
                {editingId === c.id ? (
                  <RenameInput
                    initial={c.title}
                    onCancel={() => setEditingId(null)}
                    onSave={async (title) => {
                      try {
                        await rename(c.id, title);
                        toast.show('Renamed.');
                      } catch (err) {
                        toast.show(errorMessage(err, 'Could not rename.'), 'error');
                      } finally {
                        setEditingId(null);
                      }
                    }}
                  />
                ) : (
                  <>
                    <NavLink to={`/c/${c.id}`} className="conv-link" title={c.title}>
                      {c.title}
                    </NavLink>
                    <div className="conv-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Rename "${c.title}"`}
                        onClick={() => setEditingId(c.id)}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Delete "${c.title}"`}
                        onClick={() => setDeleting(c)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this conversation?"
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        “{deleting?.title}” and its answers will be removed. This cannot be undone.
      </ConfirmDialog>
    </>
  );
}

/** Inline rename box: Enter saves, Escape cancels. */
function RenameInput({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave(title: string): void;
  onCancel(): void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) onSave(value.trim());
    } else if (e.key === 'Escape') {
      onCancel();
    }
  }

  return (
    <>
      <input
        ref={ref}
        className="conv-rename"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label="New conversation title"
        maxLength={100}
      />
      <div className="conv-actions">
        <button
          type="button"
          className="icon-btn"
          aria-label="Save title"
          onClick={() => value.trim() && onSave(value.trim())}
        >
          <CheckIcon />
        </button>
        <button type="button" className="icon-btn" aria-label="Cancel rename" onClick={onCancel}>
          <CloseIcon />
        </button>
      </div>
    </>
  );
}
