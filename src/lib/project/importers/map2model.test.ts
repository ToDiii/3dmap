import { describe, it, expect, vi } from 'vitest';
vi.mock('$lib/stores/modelStore', () => ({ invalidateModel: vi.fn() }));
import { parseM2M, applyM2M } from './map2model';
import { modelConfigStore } from '$lib/stores/modelConfigStore';
import { uiConfigStore } from '$lib/stores/uiConfigStore';
import { colorPalette } from '$lib/stores/colorPalette';
import { pathStore } from '$lib/stores/pathStore';
import { pathStyleStore } from '$lib/stores/pathStyleStore';
import { get } from 'svelte/store';

describe('map2model importer', () => {
  it('maps generator options to stores', async () => {
    const proj = parseM2M({
      generatorOptions: {
        mapWidthMM: 100,
        baseLayerMM: 2,
        elevationEnabled: false,
        elevationExaggeration: 1,
        roadEnabled: true,
        footpathRoadsEnabled: false,
        customRoadWidths: {},
        waterEnabled: true,
        waterHeightMM: 0,
        minWaterAreaM2: 0,
        customWaterwayWidths: {},
        oceanEnabled: false,
        beachEnabled: false,
        beachHeightMM: 0,
        piersEnabled: false,
        pierHeightMM: 0,
        greeneryEnabled: true,
        greeneryHeightMM: 0,
        buildingsEnabled: true,
        buildingScaleFactor: 1,
        minBuildingHeightMM: 5,
        minBuildingAreaM2: 50,
        gpxPathEnabled: true,
        gpxPathHeightMM: 1,
        gpxPathWidthMeters: 2,
        gpxPathColor: '#ff0000',
        gpxPathGeoJSON: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
        roadColor: '#111',
        waterColor: '#222',
        greeneryColor: '#333',
        buildingColor: '#444',
        sandColor: '#555',
        pierColor: '#666',
        baseColor: '#777',
        frameEnabled: true,
        frameHeightMM: 3,
        frameThicknessMM: 2,
        cropMapToBounds: true
      },
      areaPolygon: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }
    });
    await applyM2M(proj);
    expect(get(modelConfigStore).minBuildingHeightMM).toBe(5);
    expect(get(modelConfigStore).cropMapToBounds).toBe(true);
    expect(get(uiConfigStore).baseLayerMM).toBe(2);
    expect(get(uiConfigStore).frame.enabled).toBe(true);
    expect(get(colorPalette).road).toBe('#111');
    expect(get(pathStore)).toEqual(proj.generatorOptions.gpxPathGeoJSON);
    expect(get(pathStyleStore).widthMeters).toBe(2);
  });
});
