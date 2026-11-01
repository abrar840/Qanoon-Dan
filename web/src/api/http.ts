/**
 * REAL API. Implements the `Api` interface with fetch() calls to the FastAPI
 * backend, as written in web/BACKEND-CONTRACT.md.
 *
 * v1 has two endpoints: POST /ask and GET /health. Add new endpoints here
 * one at a time (and to the `Api` interface in types.ts).
 */
import { ApiError, type Api, type ApiErrorCode, type AskResponse } from './types';

// Base URL without a trailing slash, e.g. "http://127.0.0.1:8000".
// Set in web/.env.local as VITE_API_URL. Restart `npm run dev` after changing it.
const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// One small fetch wrapper used by every call below.
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST';
  /** Plain object -> sent as JSON. */
  body?: unknown;
  signal?: AbortSignal;
}

function codeForStatus(status: number): ApiErrorCode {
  if (status === 404) return 'not_found';
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
  if (status === 404) return 'Not found.';
  if (status === 429) return 'Too many questions in a short time. Please wait a minute and try again.';
  if (status >= 500) return 'QanoonDaan is busy. Please try again in a minute.';
  return 'Something went wrong. Please try again.';
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  let body: string | undefined;
  if (options.body !== undefined) {
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
    // Also what you see when CORS blocks the reply: the browser hides the reason.
    throw new ApiError('Cannot reach the server. Check your internet connection and try again.', 0, 'network');
  }

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
// The implementation
// ---------------------------------------------------------------------------

export const httpApi: Api = {
  ask(req, options) {
    return request<AskResponse>('/ask', { method: 'POST', body: req, signal: options?.signal });
  },

  health() {
    return request<{ status: string }>('/health');
  },
};
