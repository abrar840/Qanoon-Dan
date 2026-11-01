/**
 * Sidebar. On mobile it is a drawer (see layout.css).
 *
 *  - Brand at the top (plus a close button on mobile)
 *  - New chat, Settings and About as rows with icons
 *  - A short note that questions are not saved (no accounts in v1), and the disclaimer
 */
import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { CloseIcon, InfoIcon, NewChatIcon, SettingsIcon } from '../ui/Icons';
import { COPY } from '../../config/examples';

// NavLink passes isActive, so the row for the current page is highlighted
function rowClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'side-link active' : 'side-link';
}

export function Sidebar({ open, onClose }: { open: boolean; onClose(): void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move focus into the drawer when it opens, so keyboard users land inside.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <nav className={open ? 'sidebar open' : 'sidebar'} aria-label="Menu" aria-hidden={!open}>
        <div className="sidebar-head">
          <Link to="/" className="brand" aria-label={`${COPY.appName} home`}>
            <span className="brand-mark" aria-hidden="true">
              Q
            </span>
            <span>{COPY.appName}</span>
          </Link>
          <button ref={closeRef} type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>

        <div className="sidebar-body">
          {/* a plain Link, not NavLink: "New chat" should not look selected while you are chatting */}
          <Link to="/" className="side-link">
            <NewChatIcon /> New chat
          </Link>
          <NavLink to="/settings" className={rowClass}>
            <SettingsIcon /> Settings
          </NavLink>
          <NavLink to="/about" className={rowClass}>
            <InfoIcon /> About and safety
          </NavLink>
        </div>

        <div className="sidebar-foot">
          <p>Your questions are not saved. They disappear when you reload the page.</p>
          <p>{COPY.disclaimer}</p>
        </div>
      </nav>
    </>
  );
}
