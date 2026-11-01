/** Top bar: menu button (mobile only) and the brand, which links home. */
import { Link } from 'react-router-dom';
import { MenuIcon } from '../ui/Icons';
import { COPY } from '../../config/examples';

export function TopBar({ onMenu }: { onMenu(): void }) {
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
    </header>
  );
}
