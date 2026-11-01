/** Settings: theme and show sources. Saved in this browser only. */
import type { Theme } from '../api';
import { useSettings } from '../state/SettingsContext';

const THEMES: { value: Theme; label: string; desc: string }[] = [
  { value: 'system', label: 'Match my phone', desc: 'Follows the system light/dark setting.' },
  { value: 'light', label: 'Light', desc: 'Always light.' },
  { value: 'dark', label: 'Dark', desc: 'Always dark. Easier on the eyes at night.' },
];

export function SettingsPage() {
  const { settings, update } = useSettings();

  return (
    <div className="page">
      <header className="page-header">
        <h1>Settings</h1>
        <p>Saved on this device only.</p>
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
                onChange={() => update({ theme: t.value })}
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
        <h2>Sources</h2>
        <label className="choice">
          <input
            type="checkbox"
            checked={settings.show_sources}
            onChange={(e) => update({ show_sources: e.target.checked })}
          />
          <span>
            Show cited sections under each answer
            <span className="choice-desc">Turn off for a shorter screen. The answer text still names the sections.</span>
          </span>
        </label>
      </section>
    </div>
  );
}
