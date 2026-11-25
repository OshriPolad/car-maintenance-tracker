// Sentry for the browser. Disabled when VITE_SENTRY_DSN is not set (local development).
import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
  });
}
