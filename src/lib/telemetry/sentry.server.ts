import * as Sentry from '@sentry/sveltekit';
import {
  TELEMETRY_ENABLED,
  SENTRY_DSN,
  SENTRY_ENV,
  SENTRY_SAMPLE_RATE,
  SENTRY_TRACES_SAMPLE_RATE,
  APP_RELEASE
} from '$lib/config/env';

if (TELEMETRY_ENABLED && SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENV,
    release: APP_RELEASE,
    sampleRate: SENTRY_SAMPLE_RATE,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    beforeSend(event) {
      if (event.user) delete event.user;
      if (event.request?.headers) {
        delete event.request.headers['x-forwarded-for'];
        delete event.request.headers['x-real-ip'];
      }
      return event;
    }
  });
}
