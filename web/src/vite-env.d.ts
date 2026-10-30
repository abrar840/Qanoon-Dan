/// <reference types="vite/client" />

// Types for the environment variables we read via import.meta.env.
// Values come from .env.local (see .env.example). All are strings.
interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
