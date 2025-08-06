import { writable, get } from 'svelte/store';
import { convertTo3D, type MeshFeature, type Feature } from '$lib/utils/convertTo3D';
import { modelConfigStore } from './modelConfigStore';
import { bboxStore } from './bboxStore';
import { shapeStore } from './shapeStore';

export const modelStore = writable<MeshFeature[]>([]);
export const modelLoading = writable(false);
export const modelError = writable<string | null>(null);

async function loadModel() {
  modelLoading.set(true);
  modelError.set(null);
  try {
    const cfg = get(modelConfigStore);
    const bbox = get(bboxStore);
    const shape = get(shapeStore);
    const elements = Object.entries(cfg.elements)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const res = await fetch('/api/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scale: cfg.scale,
        baseHeight: cfg.baseHeight,
        buildingMultiplier: cfg.buildingMultiplier,
        minArea: cfg.excludeSmallBuildings ? cfg.minBuildingArea : undefined,
        elements,
        bbox: shape ? undefined : bbox || undefined,
        shape: shape || undefined
      })
    });
    const data = await res.json();
    if (!data?.features) {
      modelStore.set([]);
      modelError.set(data?.error || 'Ungültige Daten');
    } else {
      const meshes = convertTo3D(data.features as Feature[], cfg.baseHeight);
      modelStore.set(meshes);
    }
  } catch (err) {
    console.error('failed to load model', err);
    modelStore.set([]);
    modelError.set('Modell konnte nicht geladen werden');
  } finally {
    modelLoading.set(false);
  }
}

import { browser } from '$app/environment';

if (browser) {
  modelConfigStore.subscribe(() => loadModel());
  bboxStore.subscribe(() => loadModel());
  shapeStore.subscribe(() => loadModel());
}
