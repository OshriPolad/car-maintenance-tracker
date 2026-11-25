/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full API base URL in production, e.g. https://cmt-api.onrender.com/api. Defaults to /api (dev proxy). */
  readonly VITE_API_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
