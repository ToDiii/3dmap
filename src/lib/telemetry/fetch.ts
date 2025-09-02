import * as Sentry from '@sentry/sveltekit';

export async function telemetryFetch(input: RequestInfo, init?: RequestInit) {
	const start = performance.now();
	try {
		const res = await fetch(input, init);
		Sentry.addBreadcrumb({
			category: 'api',
			message: typeof input === 'string' ? input : input.toString(),
			data: { status: res.status, duration: performance.now() - start },
		});
		return res;
	} catch (e) {
		Sentry.addBreadcrumb({
			category: 'api',
			message: typeof input === 'string' ? input : input.toString(),
			level: 'error',
			data: { duration: performance.now() - start },
		});
		throw e;
	}
}
