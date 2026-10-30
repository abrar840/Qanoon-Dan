/**
 * User settings: theme, answer length, show/hide sources.
 *
 * Storage rules:
 *  - ALWAYS saved in localStorage ("qd.settings") so guests keep their theme
 *    and the page can apply the theme before React loads (see index.html).
 *  - When a user is logged in we ALSO load from and save to the API, so the
 *    settings follow them to another device.
 *
 * The theme is applied by setting <html data-theme="light|dark">; the CSS in
 * styles/tokens.css reads that attribute.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, DEFAULT_SETTINGS, type Settings } from '../api';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'qd.settings';

interface SettingsContextValue {
  settings: Settings;
  /** Saves locally right away, then to the API if logged in. */
  update(patch: Partial<Settings>): Promise<void>;
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
  const { user } = useAuth();
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

  // When someone logs in, pull their saved settings from the server.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .getSettings()
      .then((remote) => {
        if (cancelled) return;
        setSettings(remote);
        saveLocal(remote);
      })
      .catch(() => {
        /* keep local settings if the server call fails */
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(
    async (patch: Partial<Settings>) => {
      // Optimistic: apply immediately so the UI feels instant.
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        saveLocal(next);
        return next;
      });
      if (user) {
        try {
          const saved = await api.updateSettings(patch);
          setSettings(saved);
          saveLocal(saved);
        } catch {
          /* local copy already applied; the server copy will sync next login */
        }
      }
    },
    [user],
  );

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
