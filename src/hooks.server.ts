import type { HandleServerError } from '@sveltejs/kit';
import '$lib/telemetry/sentry.server';
import * as Sentry from '@sentry/sveltekit';

export const handleError: HandleServerError = ({ error, event }) => {
  Sentry.captureException(error, { extra: { event } });
  return { message: 'Internal Server Error' };
};
