import { writable, get } from 'svelte/store';
import type * as GeoJSON from 'geojson';
import { convertTo3D, type MeshFeature, type Feature } from '$lib/utils/convertTo3D';
import { modelConfigStore } from './modelConfigStore';
import { bboxStore } from './bboxStore';
import { shapeStore } from './shapeStore';
import { modelGeo } from './modelGeoStore';
import { telemetryFetch } from '$lib/telemetry/fetch';

export const modelStore = writable<MeshFeature[]>([]);
export const modelLoading = writable(false);
export const modelError = writable<string | null>(null);
export const modelMeta = writable<any | null>(null);

async function loadModel(invalidate = false) {
  modelLoading.set(true);
  modelError.set(null);
  modelMeta.set(null);
  try {
    const cfg = get(modelConfigStore);
    const bbox = get(bboxStore);
    const shape = get(shapeStore);
    const elements = Object.entries(cfg.elements)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const res = await telemetryFetch('/api/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scale: cfg.scale,
        baseHeight: cfg.baseHeight,
        buildingMultiplier: cfg.buildingMultiplier,
        minBuildingHeightMM: cfg.minBuildingHeightMM,
        clipToShape: cfg.cropMapToBounds && !!shape,
        minArea: cfg.excludeSmallBuildings ? cfg.minBuildingArea : undefined,
        elements,
        bbox: shape ? undefined : bbox || undefined,
        shape: shape || undefined,
        invalidate
      })
    });
    const data = await res.json();
    modelGeo.set(data?.geojson || null);
    modelMeta.set(data?.meta || null);
    if (!data?.features) {
      modelStore.set([]);
      modelError.set(data?.error || 'Ungültige Daten');
    } else if (data?.geojson?.features?.length === 0) {
      modelStore.set([]);
      modelError.set('Keine OSM-Gebäude im gewählten Bereich.');
    } else {
      const meshes = convertTo3D(data.features as Feature[], cfg.baseHeight);
      modelStore.set(meshes);
    }
  } catch (err) {
    console.error('failed to load model', err);
    modelStore.set([]);
    modelGeo.set(null);
    modelError.set('Modell konnte nicht geladen werden');
  } finally {
    modelLoading.set(false);
  }
}

export async function loadModelForRoute(
  route: GeoJSON.LineString,
  routeBufferMeters?: number
) {
  modelLoading.set(true);
  modelError.set(null);
  modelMeta.set(null);
  try {
    const cfg = get(modelConfigStore);
    const elements = Object.entries(cfg.elements)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const res = await telemetryFetch('/api/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scale: cfg.scale,
        baseHeight: cfg.baseHeight,
        buildingMultiplier: cfg.buildingMultiplier,
        minBuildingHeightMM: cfg.minBuildingHeightMM,
        minArea: cfg.excludeSmallBuildings ? cfg.minBuildingArea : undefined,
        elements,
        route,
        routeBufferMeters
      })
    });
    const data = await res.json();
    modelGeo.set(data?.geojson || null);
    modelMeta.set(data?.meta || null);
    if (!data?.features) {
      modelStore.set([]);
      modelError.set(data?.error || 'Ungültige Daten');
    } else if (data?.geojson?.features?.length === 0) {
      modelStore.set([]);
      modelError.set('Keine OSM-Gebäude im gewählten Bereich.');
    } else {
      const meshes = convertTo3D(data.features as Feature[], cfg.baseHeight);
      modelStore.set(meshes);
    }
  } catch (err) {
    console.error('failed to load model', err);
    modelStore.set([]);
    modelGeo.set(null);
    modelError.set('Modell konnte nicht geladen werden');
  } finally {
    modelLoading.set(false);
  }
}

import { browser } from '$app/environment';

export function invalidateModel() {
  loadModel(true);
}

if (browser) {
  modelConfigStore.subscribe(() => loadModel());
  bboxStore.subscribe(() => loadModel());
  shapeStore.subscribe(() => loadModel());
}
