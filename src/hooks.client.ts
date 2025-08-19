import type { HandleClientError } from '@sveltejs/kit';
import '$lib/telemetry/sentry.client';
import * as Sentry from '@sentry/sveltekit';

export const handleError: HandleClientError = ({ error, event }) => {
  Sentry.captureException(error, { extra: { event } });
};
