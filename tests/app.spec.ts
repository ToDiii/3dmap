import { test, expect } from '@playwright/test';

const invalidGpx = '<gpx></gpx>';

test('shows error for invalid GPX upload', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type="file"]', {
    name: 'track.gpx',
    mimeType: 'application/gpx+xml',
    buffer: Buffer.from(invalidGpx)
  });
  await expect(page.getByText('GPX-Datei konnte nicht geladen werden')).toBeVisible();
});

test('displays error when model request fails', async ({ page }) => {
  await page.route('**/api/model', (route) => route.fulfill({ status: 500, body: '{}' }));
  await page.goto('/');
  await page.click('text=3D Ansicht');
  await expect(page.getByText('Modell konnte nicht geladen werden')).toBeVisible();
});
