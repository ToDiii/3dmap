import { test, expect } from '@playwright/test';

const invalidGpx = '<gpx></gpx>';
const validGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test"><trk><trkseg>
<trkpt lat="48.137154" lon="11.576124"></trkpt>
<trkpt lat="48.1375" lon="11.5765"></trkpt>
</trkseg></trk></gpx>`;

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

test('renders track after valid GPX upload', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('input[type="file"]', {
    name: 'track.gpx',
    mimeType: 'application/gpx+xml',
    buffer: Buffer.from(validGpx)
  });
  await page.waitForFunction(async () => {
    const { pathStore } = await import('/src/lib/stores/pathStore.ts');
    return new Promise((resolve) => {
      const unsub = pathStore.subscribe((v) => {
        if (v) {
          unsub();
          resolve(true);
        }
      });
    });
  });
  await page.waitForFunction(async () => {
    const { mapStore } = await import('/src/lib/stores/map.ts');
    const map = await new Promise((resolve) => {
      const unsub = mapStore.subscribe((m) => {
        if (m) {
          unsub();
          resolve(m);
        }
      });
    });
    return map.getLayer('gpx-track-line') != null;
  });
});

test('allows drawing and deleting path via PathEditor', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Neuen Pfad zeichnen');
  const canvas = page.locator('canvas');
  await canvas.waitFor();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas box');
  const start = { x: box.x + 50, y: box.y + 50 };
  const end = { x: start.x + 100, y: start.y + 50 };
  await page.mouse.click(start.x, start.y);
  await page.mouse.dblclick(end.x, end.y);
  await page.waitForFunction(async () => {
    const { pathStore } = await import('/src/lib/stores/pathStore.ts');
    return new Promise((resolve) => {
      const unsub = pathStore.subscribe((v) => {
        if (v) {
          unsub();
          resolve(true);
        }
      });
    });
  });
  await page.click('text=Pfad löschen');
  await page.waitForFunction(async () => {
    const { pathStore } = await import('/src/lib/stores/pathStore.ts');
    return new Promise((resolve) => {
      const unsub = pathStore.subscribe((v) => {
        if (v === null) {
          unsub();
          resolve(true);
        }
      });
    });
  });
});

test('generates model and displays in viewer', async ({ page }) => {
  await page.route('**/api/model', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        features: [
          {
            geometry: [
              [0, 0, 0],
              [0, 0, 1],
              [1, 0, 1],
              [1, 0, 0]
            ],
            height: 10,
            type: 'building'
          }
        ]
      })
    })
  );
  await page.goto('/');
  await page.waitForFunction(async () => {
    const { mapStore } = await import('/src/lib/stores/map.ts');
    return new Promise((resolve) => {
      const unsub = mapStore.subscribe((m) => {
        if (m) {
          unsub();
          resolve(true);
        }
      });
    });
  });
  await page.evaluate(async () => {
    const { shapeStore } = await import('/src/lib/stores/shapeStore.ts');
    shapeStore.set({
      type: 'Polygon',
      coordinates: [[[0, 0],[0, 1],[1, 1],[1, 0],[0, 0]]]
    });
  });
  await page.waitForFunction(async () => {
    const { modelStore, modelLoading } = await import('/src/lib/stores/modelStore.ts');
    return new Promise((resolve) => {
      const unsubL = modelLoading.subscribe((l) => {
        if (!l) {
          const unsub = modelStore.subscribe((v) => {
            if (v.length > 0) {
              unsub();
              unsubL();
              resolve(true);
            }
          });
        }
      });
    });
  });
  await page.click('text=3D Ansicht');
  await page.waitForSelector('canvas');
  const childCount = await page.evaluate(async () => {
    const mod = await import('/src/lib/components/Viewer.svelte');
    return mod.__test_getModelGroup().children.length;
  });
  expect(childCount).toBeGreaterThan(0);
});
