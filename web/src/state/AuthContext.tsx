/**
 * Who is logged in. Loaded once on app start via api.getMe(), then kept in
 * sync with api.onAuthStateChange(). Any component can call useAuth().
 *
 *   const { user, loading, logIn, logOut } = useAuth();
 *   user === null  -> guest
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type LogInInput, type SignUpInput, type SignUpResult, type User } from '../api';

interface AuthContextValue {
  user: User | null;
  /** true until the first getMe() finishes. Show nothing user-specific before that. */
  loading: boolean;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  logIn(input: LogInInput): Promise<User>;
  logOut(): Promise<void>;
  /** Replace the user object after a profile edit. */
  setUser(user: User | null): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api
      .getMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        // Backend down or token expired: treat as guest, do not crash.
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const unsubscribe = api.onAuthStateChange((u) => {
      if (!cancelled) setUser(u);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const result = await api.signUp(input);
    if (result.user) setUser(result.user);
    return result;
  }, []);

  const logIn = useCallback(async (input: LogInInput) => {
    const u = await api.logIn(input);
    setUser(u);
    return u;
  }, []);

  const logOut = useCallback(async () => {
    await api.logOut();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signUp, logIn, logOut, setUser }),
    [user, loading, signUp, logIn, logOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
