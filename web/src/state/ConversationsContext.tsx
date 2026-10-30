/**
 * The conversation list shown in the sidebar. Only loaded for logged-in users.
 * ChatPage calls refresh() after a new conversation is created so the sidebar
 * updates without a page reload.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Conversation } from '../api';
import { useAuth } from './AuthContext';

interface ConversationsContextValue {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  refresh(): Promise<void>;
  rename(id: string, title: string): Promise<void>;
  remove(id: string): Promise<void>;
  removeAll(): Promise<void>;
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setConversations([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setConversations(await api.listConversations());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load history.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Reload whenever the logged-in user changes (login, logout, other tab).
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rename = useCallback(async (id: string, title: string) => {
    const updated = await api.renameConversation(id, title);
    setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await api.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const removeAll = useCallback(async () => {
    await api.deleteAllConversations();
    setConversations([]);
  }, []);

  const value = useMemo(
    () => ({ conversations, loading, error, refresh, rename, remove, removeAll }),
    [conversations, loading, error, refresh, rename, remove, removeAll],
  );

  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
}

export function useConversations(): ConversationsContextValue {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error('useConversations must be used inside <ConversationsProvider>');
  return ctx;
}
