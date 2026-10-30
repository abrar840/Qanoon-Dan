/**
 * THE API CONTRACT (frontend side).
 *
 * Every piece of data the UI needs from a server is described here, once.
 * Two files implement this interface:
 *   - mock.ts  : fake data in localStorage, used while the backend is not ready
 *   - http.ts  : real fetch() calls to the FastAPI backend
 * Components never import those two files. They import `api` from ./index.ts,
 * which picks one implementation based on VITE_USE_MOCK.
 *
 * Field names use snake_case on purpose: they match the JSON that FastAPI /
 * Pydantic will send, so there is no renaming layer to maintain.
 * The full endpoint-by-endpoint spec is in web/BACKEND-CONTRACT.md.
 */

// ---------------------------------------------------------------------------
// Shared small types
// ---------------------------------------------------------------------------

/** How long the model's answer should be. Sent with /ask, stored in settings. */
export type AnswerLength = 'short' | 'normal' | 'detailed';

/** UI theme. 'system' follows the phone / OS preference. */
export type Theme = 'light' | 'dark' | 'system';

/** Thumbs up or thumbs down on one answer. */
export type FeedbackRating = 'up' | 'down';

// ---------------------------------------------------------------------------
// POST /ask  (v1, the only endpoint the product needs to work)
// ---------------------------------------------------------------------------

export interface AskRequest {
  /** 3 to 1000 characters. The backend validates this too. */
  question: string;
  /**
   * v2, optional. When the user is logged in and is continuing a chat, the id
   * of that conversation. Omit (or null) to start a new conversation.
   * A guest never sends this.
   */
  conversation_id?: string | null;
  /** v2, optional. Taken from the user's settings. Backend may ignore it. */
  answer_length?: AnswerLength;
}

/** One cited PPC section. Matches the `Source` Pydantic model in day-14. */
export interface Source {
  /** e.g. "302" or "489-F" */
  section: string;
  /** e.g. "Pakistan Penal Code, 1860" */
  law: string;
  /** Vector distance, smaller = closer match. Shown only as a subtle hint. */
  distance: number;
  /** First ~300 characters of the section text. Shown on the source card. */
  snippet: string;
}

export interface AskResponse {
  answer: string;
  sources: Source[];
  /** true = the system did not know and said so (no sources). */
  refused: boolean;
  /** true = a person may be in danger; the UI shows helplines first. */
  crisis: boolean;
  disclaimer: string;
  /**
   * v2, optional. When the user is logged in the backend saves the exchange
   * and returns where it was saved, so the UI can open /c/:conversation_id
   * and attach feedback to the message. Both are null/absent for guests.
   */
  conversation_id?: string | null;
  message_id?: string | null;
}

// ---------------------------------------------------------------------------
// Auth and profile (v2)
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  /** Public URL of the avatar image, or null to show initials. */
  avatar_url: string | null;
  /** ISO 8601 date-time string. */
  created_at: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
}

export interface SignUpResult {
  /** null when the user must confirm their email before a session exists. */
  user: User | null;
  needs_email_confirmation: boolean;
}

export interface LogInInput {
  email: string;
  password: string;
}

export interface ProfileUpdate {
  name?: string;
  avatar_url?: string | null;
}

// ---------------------------------------------------------------------------
// Conversation history (v2)
// ---------------------------------------------------------------------------

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * One saved question/answer pair. We store the pair as ONE row instead of two
 * "role" rows because /ask is always exactly one question -> one answer.
 * That keeps the database and the UI simpler.
 */
export interface Message {
  id: string;
  conversation_id: string;
  question: string;
  answer: string;
  sources: Source[];
  refused: boolean;
  crisis: boolean;
  /** The rating this user gave, if any. */
  feedback: FeedbackRating | null;
  created_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

// ---------------------------------------------------------------------------
// Feedback and settings (v2)
// ---------------------------------------------------------------------------

export interface FeedbackInput {
  /** Present when the answer was saved (logged-in user). Null for guests. */
  message_id?: string | null;
  rating: FeedbackRating;
  /** Optional free text, mainly asked for after a thumbs-down. */
  comment?: string;
  /** Copied so guest feedback still makes sense without a message row. */
  question: string;
  answer: string;
}

export interface Settings {
  theme: Theme;
  answer_length: AnswerLength;
  show_sources: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  answer_length: 'normal',
  show_sources: true,
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Machine-readable reason, so components can react without parsing text. */
export type ApiErrorCode =
  | 'network' // could not reach the server at all
  | 'unauthorized' // 401: not logged in or session expired
  | 'forbidden' // 403
  | 'not_found' // 404
  | 'conflict' // 409: e.g. email already registered
  | 'validation' // 422: bad input (question too short, etc.)
  | 'rate_limited' // 429: too many requests
  | 'server' // 5xx or unknown
  | 'config'; // frontend is missing an env var

/**
 * Every implementation throws this (and only this) when something fails, so
 * the UI has one error shape to deal with. `message` is safe to show users.
 */
export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;

  constructor(message: string, status: number, code: ApiErrorCode) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Helper: turn any thrown value into a message the UI can show. */
export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

// ---------------------------------------------------------------------------
// THE INTERFACE
// ---------------------------------------------------------------------------

export interface Api {
  // ----- v1 -----
  /** Ask a legal question. Works for guests and logged-in users. */
  ask(req: AskRequest, options?: { signal?: AbortSignal }): Promise<AskResponse>;

  /** GET /health. Used to show a "backend offline" hint. */
  health(): Promise<{ status: string }>;

  // ----- v2: auth -----
  signUp(input: SignUpInput): Promise<SignUpResult>;
  logIn(input: LogInInput): Promise<User>;
  logOut(): Promise<void>;
  /** The current user, or null when nobody is logged in. Called on app start. */
  getMe(): Promise<User | null>;
  /**
   * Subscribe to login/logout changes that happen outside our own calls
   * (another tab, session expiry, the password-reset email link).
   * Returns an unsubscribe function. Call it in a useEffect cleanup.
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void;
  /** Sends the "reset your password" email. Always resolves (no user enumeration). */
  forgotPassword(email: string): Promise<void>;
  /** Sets a new password for the user who arrived via the reset link. */
  resetPassword(newPassword: string): Promise<void>;

  // ----- v2: profile -----
  updateProfile(patch: ProfileUpdate): Promise<User>;
  /** Uploads an image and returns its public URL. Max 1 MB, image/* only. */
  uploadAvatar(file: File): Promise<{ avatar_url: string }>;
  /** Deletes the account and every row that belongs to it. Logs out. */
  deleteAccount(): Promise<void>;

  // ----- v2: conversations -----
  listConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<ConversationDetail>;
  renameConversation(id: string, title: string): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  /** "Delete my data" in Settings: removes all conversations and messages. */
  deleteAllConversations(): Promise<void>;

  // ----- v2: feedback -----
  sendFeedback(input: FeedbackInput): Promise<{ id: string }>;

  // ----- v2: settings -----
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
}
