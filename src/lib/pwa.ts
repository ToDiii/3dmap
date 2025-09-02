import { writable } from 'svelte/store';
import { Workbox } from 'workbox-window';
import { browser } from '$app/environment';

export const updateAvailable = writable(false);
let wb: Workbox | null = null;

export function initPWA() {
	if (browser && 'serviceWorker' in navigator) {
		wb = new Workbox('/service-worker.js');
		wb.addEventListener('waiting', () => {
			updateAvailable.set(true);
		});
		wb.addEventListener('message', (event) => {
			if (event.data === 'refresh') {
				window.location.reload();
			}
		});
		wb.register();
	}
}

export function skipWaiting() {
	if (!browser) return;
	wb?.messageSkipWaiting();
}
