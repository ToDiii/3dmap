import { test, expect } from '@playwright/test';

test.skip(process.env.E2E_ENABLED !== 'true', 'E2E disabled in this environment');

test('extrude-buildings layer exists', async ({ page }) => {
	await page.goto('/');
	await page.waitForFunction(
		() => (window as any).__map && (window as any).__map.getLayer('extrude-buildings') !== undefined
	);
	const hasLayer = await page.evaluate(() => {
		const map = (window as any).__map;
		return !!map.getLayer('extrude-buildings');
	});
	expect(hasLayer).toBe(true);
});
