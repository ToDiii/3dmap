import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

const pwaEnabled = process.env.PWA_ENABLED === 'true';
const tileDomains = (process.env.TILE_CACHE_ALLOWLIST || '')
	.split(',')
	.map((d) => d.trim())
	.filter(Boolean);

const runtimeCaching: any[] = [
	{
		urlPattern: /\/_app\/.*$/,
		handler: 'StaleWhileRevalidate',
		options: { cacheName: 'app-cache' },
	},
	{
		urlPattern: ({ request }: any) => request.mode === 'navigate',
		handler: 'NetworkFirst',
		options: { cacheName: 'html-cache' },
	},
	{
		urlPattern: /\/api\/geocode.*$/,
		handler: 'StaleWhileRevalidate',
		options: {
			cacheName: 'api-geocode',
			expiration: { maxAgeSeconds: 60 * 60 * 24, maxEntries: 500 },
		},
	},
	{
		urlPattern: /\/api\/route.*$/,
		handler: 'StaleWhileRevalidate',
		options: {
			cacheName: 'api-route',
			expiration: { maxAgeSeconds: 60 * 60, maxEntries: 200 },
		},
	},
	{
		urlPattern: /\/api\/model.*$/,
		handler: 'NetworkFirst',
		options: {
			cacheName: 'api-model',
			networkTimeoutSeconds: 8,
			expiration: { maxAgeSeconds: 60 * 60 * 24, maxEntries: 100 },
		},
	},
];

for (const domain of tileDomains) {
	runtimeCaching.push({
		urlPattern: new RegExp(`https?:\\/\\/${domain.replace(/\./g, '\\.')}`),
		handler: 'CacheFirst',
		options: {
			cacheName: `tiles-${domain.replace(/[^a-z0-9]/gi, '-')}`,
			expiration: { maxAgeSeconds: 60 * 60 * 6, maxEntries: 200 },
		},
	});
}

export default defineConfig({
	plugins: [
		sveltekit(),
		pwaEnabled &&
			SvelteKitPWA({
				registerType: 'autoUpdate',
				manifest: false,
				workbox: {
					runtimeCaching,
				},
			}),
	].filter(Boolean),
	optimizeDeps: {
		include: ['three', 'three/examples/jsm/utils/BufferGeometryUtils.js'],
	},
	ssr: {
		noExternal: ['three'],
	},
});
