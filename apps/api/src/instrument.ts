// Sentry must be initialized before anything else is imported (see main.ts).
// It is disabled when SENTRY_DSN is not set, so local development is not affected.
import * as Sentry from "@sentry/nestjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? "development",
    tracesSampleRate: 0.1,
  });
}
