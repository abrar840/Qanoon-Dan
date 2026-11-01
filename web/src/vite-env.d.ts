/// <reference types="vite/client" />

// Types for the environment variables we read via import.meta.env.
// Values come from .env.local (see .env.example). All are strings.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
