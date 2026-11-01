/**
 * User settings: theme and show/hide sources.
 *
 * Saved in localStorage ("qd.settings") so they survive a reload, and so the
 * page can apply the theme before React loads (see index.html).
 *
 * The theme is applied by setting <html data-theme="light|dark">; the CSS in
 * styles/tokens.css reads that attribute.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type Settings } from '../api';

const STORAGE_KEY = 'qd.settings';

interface SettingsContextValue {
  settings: Settings;
  update(patch: Partial<Settings>): void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadLocal(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveLocal(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: the setting still works for this page load */
  }
}

/** Resolve 'system' to the actual light/dark value and put it on <html>. */
function applyTheme(theme: Settings['theme']): void {
  const resolved =
    theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadLocal);

  // Apply the theme whenever it changes, and follow the OS when on 'system'.
  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings.theme]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveLocal(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
