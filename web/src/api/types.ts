/**
 * THE API CONTRACT (frontend side).
 *
 * Every piece of data the UI needs from a server is described here, once.
 * http.ts implements this interface with real fetch() calls to the FastAPI
 * backend. Components never import http.ts; they import `api` from ./index.ts.
 *
 * Field names use snake_case on purpose: they match the JSON that FastAPI /
 * Pydantic sends (app/schemas.py), so there is no renaming layer to maintain.
 * The full endpoint-by-endpoint spec is in web/BACKEND-CONTRACT.md.
 */

// ---------------------------------------------------------------------------
// POST /ask
// ---------------------------------------------------------------------------

export interface AskRequest {
  /** 3 to 500 characters. The backend validates this too. */
  question: string;
}

/** One cited PPC section. Matches `Source` in app/schemas.py. */
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

/** Matches `AskResponse` in app/schemas.py. */
export interface AskResponse {
  answer: string;
  sources: Source[];
  /** true = the system did not know and said so (no sources). */
  refused: boolean;
  /** true = a person may be in danger; the backend puts helplines at the top of `answer`. */
  crisis: boolean;
  disclaimer: string;
}

// ---------------------------------------------------------------------------
// Settings (stored in the browser only, not sent to the server)
// ---------------------------------------------------------------------------

/** UI theme. 'system' follows the phone / OS preference. */
export type Theme = 'light' | 'dark' | 'system';

export interface Settings {
  theme: Theme;
  show_sources: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  show_sources: true,
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Machine-readable reason, so components can react without parsing text. */
export type ApiErrorCode =
  | 'network' // could not reach the server at all (or CORS blocked it)
  | 'not_found' // 404
  | 'validation' // 422: bad input (question too short, etc.)
  | 'rate_limited' // 429: too many requests
  | 'server'; // 5xx or unknown

/**
 * http.ts throws this (and only this) when something fails, so the UI has
 * one error shape to deal with. `message` is safe to show users.
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
// THE INTERFACE: every server call the UI can make.
// ---------------------------------------------------------------------------

export interface Api {
  /** POST /ask. Ask a legal question. */
  ask(req: AskRequest, options?: { signal?: AbortSignal }): Promise<AskResponse>;

  /** GET /health. */
  health(): Promise<{ status: string }>;
}
