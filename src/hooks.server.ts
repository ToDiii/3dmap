import type { HandleServerError } from '@sveltejs/kit';
import '$lib/telemetry/sentry.server';
import * as Sentry from '@sentry/sveltekit';

export const handleError: HandleServerError = ({ error, event }) => {
	Sentry.captureException(error, { tags: { path: event.url.pathname } });
	return { message: 'Internal Server Error' };
};
