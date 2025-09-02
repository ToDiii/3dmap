import { onCLS, onLCP, onINP } from 'web-vitals';
import * as Sentry from '@sentry/sveltekit';
import { settingsStore } from '$lib/stores/settingsStore';
import { TELEMETRY_ENABLED, SENTRY_DSN } from '$lib/config/env';
import { get } from 'svelte/store';

function send(metric: any) {
	Sentry.captureMessage(`web-vital-${metric.name}`, {
		level: 'info',
		contexts: {
			metric: {
				value: metric.value,
				rating: metric.rating,
			},
		},
	});
}

export function initWebVitals() {
	const consent = get(settingsStore).telemetryConsent;
	if (!(TELEMETRY_ENABLED && SENTRY_DSN && consent)) {
		const log = (m: any) => console.info('web-vital', m);
		onCLS(log);
		onLCP(log);
		onINP(log);
		return;
	}
	onCLS(send);
	onLCP(send);
	onINP(send);
}
