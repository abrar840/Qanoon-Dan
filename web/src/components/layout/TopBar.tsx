/**
 * Top bar: menu button (mobile only), brand, and either a "Log in" link or
 * the user's avatar with a small menu (Profile, Settings, Log out).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { useToast } from '../../state/ToastContext';
import { Avatar } from '../ui/Avatar';
import { MenuIcon } from '../ui/Icons';
import { COPY } from '../../config/examples';

export function TopBar({ onMenu }: { onMenu(): void }) {
  const { user, loading, logOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the user menu when clicking elsewhere or pressing Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  async function handleLogOut() {
    setMenuOpen(false);
    try {
      await logOut();
      toast.show('Logged out.');
      navigate('/');
    } catch {
      toast.show('Could not log out. Try again.', 'error');
    }
  }

  return (
    <header className="topbar">
      <button type="button" className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu">
        <MenuIcon />
      </button>

      <Link to="/" className="brand" aria-label={`${COPY.appName} home`}>
        <span className="brand-mark" aria-hidden="true">
          Q
        </span>
        <span>{COPY.appName}</span>
      </Link>

      <div className="topbar-spacer" />

      {loading ? null : user ? (
        <div className="user-menu" ref={menuRef}>
          <button
            type="button"
            className="icon-btn"
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Avatar user={user} />
          </button>
          {menuOpen && (
            <div className="menu" role="menu">
              <div className="menu-header">
                <strong>{user.name || 'Your account'}</strong>
                <span>{user.email}</span>
              </div>
              <Link to="/profile" className="menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                Profile
              </Link>
              <Link to="/settings" className="menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                Settings
              </Link>
              <button type="button" className="menu-item" role="menuitem" onClick={handleLogOut}>
                Log out
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link to="/login" className="btn btn-sm">
          Log in
        </Link>
      )}
    </header>
  );
}
