/**
 * REAL API. Implements the `Api` interface with fetch() calls to the FastAPI
 * backend, exactly as written in web/BACKEND-CONTRACT.md.
 *
 * Authentication: Supabase Auth runs in the browser (supabase.ts). After
 * login we hold a JWT. Every request to FastAPI carries it as
 *     Authorization: Bearer <jwt>
 * and FastAPI verifies it with the project's JWT secret / JWKS.
 *
 * This file will not work until the backend endpoints exist. That is expected.
 */
import {
  ApiError,
  DEFAULT_SETTINGS,
  type Api,
  type ApiErrorCode,
  type AskResponse,
  type Conversation,
  type ConversationDetail,
  type Settings,
  type User,
} from './types';
import { getAccessToken, requireSupabase, supabase } from './supabase';

// Base URL without a trailing slash, e.g. "http://127.0.0.1:8000".
const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// One small fetch wrapper used by every call below.
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Plain object -> sent as JSON. FormData -> sent as multipart. */
  body?: unknown;
  /** true = fail fast with 401 if there is no token. */
  requireAuth?: boolean;
  signal?: AbortSignal;
}

function codeForStatus(status: number): ApiErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status === 429) return 'rate_limited';
  return 'server';
}

/** Friendly text for each failure. FastAPI puts its message in `detail`. */
function messageFor(status: number, detail: unknown): string {
  if (typeof detail === 'string' && detail.trim()) return detail;
  // Pydantic validation errors come as a list of {loc, msg, type}.
  if (Array.isArray(detail) && detail.length && typeof detail[0]?.msg === 'string') {
    return detail[0].msg;
  }
  if (status === 401) return 'Please log in to continue.';
  if (status === 404) return 'Not found.';
  if (status === 429) return 'Too many questions in a short time. Please wait a minute and try again.';
  if (status >= 500) return 'QanoonDaan is busy. Please try again in a minute.';
  return 'Something went wrong. Please try again.';
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  const token = await getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (options.requireAuth) throw new ApiError('Please log in to continue.', 401, 'unauthorized');

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body; // the browser sets the multipart Content-Type itself
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(BASE_URL + path, {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request cancelled.', 0, 'network');
    }
    throw new ApiError('Cannot reach the server. Check your internet connection and try again.', 0, 'network');
  }

  if (response.status === 204) return undefined as T;

  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const detail =
      data && typeof data === 'object' && 'detail' in data ? (data as { detail: unknown }).detail : data;
    throw new ApiError(messageFor(response.status, detail), response.status, codeForStatus(response.status));
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Supabase user -> our User shape (used when the backend profile is missing)
// ---------------------------------------------------------------------------

function userFromSession(sessionUser: {
  id: string;
  email?: string;
  created_at: string;
  user_metadata: Record<string, unknown>;
}): User {
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? '',
    name: typeof sessionUser.user_metadata.name === 'string' ? sessionUser.user_metadata.name : '',
    avatar_url:
      typeof sessionUser.user_metadata.avatar_url === 'string' ? sessionUser.user_metadata.avatar_url : null,
    created_at: sessionUser.created_at,
  };
}

/** Maps Supabase auth errors to our ApiError. */
function authError(err: { message: string; status?: number }): ApiError {
  const status = err.status ?? 400;
  const lower = err.message.toLowerCase();
  if (lower.includes('invalid login')) return new ApiError('Incorrect email or password.', 401, 'unauthorized');
  if (lower.includes('already registered')) {
    return new ApiError('An account with this email already exists. Try logging in.', 409, 'conflict');
  }
  return new ApiError(err.message, status, codeForStatus(status));
}

// ---------------------------------------------------------------------------
// The implementation
// ---------------------------------------------------------------------------

export const httpApi: Api = {
  // ----- v1 -----

  ask(req, options) {
    // Guests send only { question }. Logged-in users may add conversation_id
    // and answer_length; Pydantic ignores unknown/optional fields in v1.
    return request<AskResponse>('/ask', { method: 'POST', body: req, signal: options?.signal });
  },

  health() {
    return request<{ status: string }>('/health');
  },

  // ----- auth (Supabase in the browser) -----

  async signUp({ email, password, name }) {
    const sb = requireSupabase();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      // Stored in auth.users.raw_user_meta_data; the DB trigger copies it to profiles.name
      options: { data: { name } },
    });
    if (error) throw authError(error);

    // With "Confirm email" ON in Supabase, there is no session yet.
    if (!data.session || !data.user) return { user: null, needs_email_confirmation: true };

    const me = await httpApi.getMe();
    return { user: me ?? userFromSession(data.user), needs_email_confirmation: false };
  },

  async logIn({ email, password }) {
    const sb = requireSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw authError(error);
    const me = await httpApi.getMe();
    return me ?? userFromSession(data.user);
  },

  async logOut() {
    const sb = requireSupabase();
    const { error } = await sb.auth.signOut();
    if (error) throw authError(error);
  },

  async getMe() {
    if (!supabase) return null; // not configured -> behave as logged out
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    try {
      return await request<User>('/me', { requireAuth: true });
    } catch (err) {
      // Profile row missing (trigger not yet created) -> fall back to the JWT.
      if (err instanceof ApiError && err.code === 'not_found') return userFromSession(data.session.user);
      throw err;
    }
  },

  onAuthStateChange(callback) {
    if (!supabase) return () => undefined;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore the initial event; AuthContext already called getMe().
      if (event === 'INITIAL_SESSION') return;
      if (!session) {
        callback(null);
        return;
      }
      httpApi.getMe().then(callback).catch(() => callback(userFromSession(session.user)));
    });
    return () => data.subscription.unsubscribe();
  },

  async forgotPassword(email) {
    const sb = requireSupabase();
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      // Supabase sends the user back here with a recovery session in the URL.
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw authError(error);
  },

  async resetPassword(newPassword) {
    const sb = requireSupabase();
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw authError(error);
  },

  // ----- profile -----

  updateProfile(patch) {
    return request<User>('/me', { method: 'PATCH', body: patch, requireAuth: true });
  },

  uploadAvatar(file) {
    const form = new FormData();
    form.append('file', file);
    return request<{ avatar_url: string }>('/me/avatar', { method: 'POST', body: form, requireAuth: true });
  },

  async deleteAccount() {
    await request<void>('/me', { method: 'DELETE', requireAuth: true });
    // The auth user is gone server-side; clear the local session too.
    if (supabase) await supabase.auth.signOut();
  },

  // ----- conversations -----

  listConversations() {
    return request<Conversation[]>('/conversations', { requireAuth: true });
  },

  getConversation(id) {
    return request<ConversationDetail>(`/conversations/${encodeURIComponent(id)}`, { requireAuth: true });
  },

  renameConversation(id, title) {
    return request<Conversation>(`/conversations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { title },
      requireAuth: true,
    });
  },

  deleteConversation(id) {
    return request<void>(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE', requireAuth: true });
  },

  deleteAllConversations() {
    return request<void>('/conversations', { method: 'DELETE', requireAuth: true });
  },

  // ----- feedback -----

  sendFeedback(input) {
    // Works for guests too (no token -> backend stores user_id = null).
    return request<{ id: string }>('/feedback', { method: 'POST', body: input });
  },

  // ----- settings -----

  async getSettings() {
    const s = await request<Partial<Settings>>('/me/settings', { requireAuth: true });
    return { ...DEFAULT_SETTINGS, ...s };
  },

  updateSettings(patch) {
    return request<Settings>('/me/settings', { method: 'PATCH', body: patch, requireAuth: true });
  },
};
