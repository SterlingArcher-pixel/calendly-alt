import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://563ea1f2b11dbfc94207e6d8854d5eda@o4510993310875648.ingest.us.sentry.io/4510993314742272",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
