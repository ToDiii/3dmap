import * as Sentry from '@sentry/sveltekit';
import { browser } from '$app/environment';
import {
  TELEMETRY_ENABLED,
  SENTRY_DSN,
  SENTRY_ENV,
  SENTRY_SAMPLE_RATE,
  SENTRY_TRACES_SAMPLE_RATE,
  APP_RELEASE
} from '$lib/config/env';
import { settingsStore } from '$lib/stores/settingsStore';

export function scrubEvent(event: Sentry.Event): Sentry.Event | null {
  if (event.request?.url) {
    try {
      const u = new URL(event.request.url);
      u.search = '';
      u.hash = '';
      const rounded = u.toString().replace(/-?\d+\.\d+/g, (m) => {
        return Number.parseFloat(m).toFixed(2);
      });
      event.request.url = rounded;
    } catch {}
  }
  if (event.user) delete event.user;
  return event;
}

function init() {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENV,
    release: APP_RELEASE,
    sampleRate: SENTRY_SAMPLE_RATE,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    denyUrls: [/tile/, /cdn/],
    beforeSend(event) {
      return scrubEvent(event);
    }
  });
}

if (browser && TELEMETRY_ENABLED && SENTRY_DSN) {
  let initialized = false;
  settingsStore.subscribe((s) => {
    if (s.telemetryConsent && !initialized) {
      init();
      initialized = true;
    }
  });
}
