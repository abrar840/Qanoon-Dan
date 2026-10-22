/**
 * The ONE place that decides which API implementation the app uses.
 *
 *   VITE_USE_MOCK=true   -> mock.ts (fake data in localStorage)
 *   VITE_USE_MOCK=false  -> http.ts (real FastAPI backend)
 *
 * If the variable is missing we default to the mock, so a fresh clone always
 * runs. Components import `api` from here and nothing else.
 */
import type { Api } from './types';
import { mockApi } from './mock';
import { httpApi } from './http';

export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true').toLowerCase() !== 'false';

export const api: Api = USE_MOCK ? mockApi : httpApi;

// Re-export the types so components can write `import { api, type User } from '../api'`.
export * from './types';
