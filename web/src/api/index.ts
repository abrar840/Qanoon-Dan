/**
 * The ONE place components get the API from.
 *
 * `api` is the real FastAPI backend (http.ts), at VITE_API_URL.
 * Components import `api` from here and nothing else, so if the way we talk
 * to the server ever changes, only this folder changes.
 */
import type { Api } from './types';
import { httpApi } from './http';

export const api: Api = httpApi;

// Re-export the types so components can write `import { api, type User } from '../api'`.
export * from './types';
