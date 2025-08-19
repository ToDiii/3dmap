import { get } from 'svelte/store';
import { modelConfigStore } from '$lib/stores/modelConfigStore';
import { bboxStore } from '$lib/stores/bboxStore';
import { shapeStore } from '$lib/stores/shapeStore';
import { pathStore } from '$lib/stores/pathStore';
import { routeStore } from '$lib/stores/routeStore';
import { layerStore } from '$lib/stores/layerStore';
import { mapStore } from '$lib/stores/map';
import { viewModeStore } from '$lib/stores/viewModeStore';
import type { SceneState } from './schema';
import { serialize } from './serialize';
import { writeToUrl } from './url';
import { browser } from '$app/environment';
import { loadModelForRoute } from '$lib/stores/modelStore';

let writeTimer: any;
let applying = false;

export function collectCurrentState(): SceneState {
  const cfg = get(modelConfigStore);
  const shape = get(shapeStore);
  const bbox = get(bboxStore);
  const route = get(routeStore);
  const layers = get(layerStore);
  const mode = get(viewModeStore);
  const map = get(mapStore);
  const elementTypes = Object.entries(cfg.elements)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const state: SceneState = {
    v: 1,
    model: {
      scale: cfg.scale,
      baseHeight: cfg.baseHeight,
      buildingMultiplier: cfg.buildingMultiplier,
      elementTypes
    }
  };

  if (shape) state.shape = shape;
  else if (bbox) {
    const [south, west, north, east] = bbox;
    state.shape = { bbox: [west, south, east, north] };
  }

  if (route.waypoints.length) {
    const wps = route.waypoints
      .filter((w) => w.coord)
      .map((w) => ({ a: w.address, c: w.coord as [number, number] }));
    const r: any = { waypoints: wps };
    if (route.route) r.line = route.route;
    state.route = r;
  }

  if (map) {
    const c = map.getCenter();
    state.view = {
      map: {
        center: [c.lng, c.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch()
      },
      mode
    };
  } else {
    state.view = { map: { center: [0, 0], zoom: 0 }, mode };
  }

  if (layers) state.layers = layers;
  state.meta = { ts: Date.now() };
  return state;
}

export async function applyState(scene: SceneState): Promise<void> {
  applying = true;
  const cfg = get(modelConfigStore);
  modelConfigStore.set({
    ...cfg,
    scale: scene.model.scale,
    baseHeight: scene.model.baseHeight,
    buildingMultiplier: scene.model.buildingMultiplier,
    elements: {
      buildings: scene.model.elementTypes.includes('buildings'),
      roads: scene.model.elementTypes.includes('roads'),
      water: scene.model.elementTypes.includes('water'),
      green: scene.model.elementTypes.includes('green')
    }
  });

    if (scene.layers)
      layerStore.set({ buildings3d: true, water: true, green: true, ...scene.layers });

  if (scene.shape) {
      if ('bbox' in scene.shape && scene.shape.bbox) {
        const [west, south, east, north] = scene.shape.bbox;
        bboxStore.set([south, west, north, east]);
        shapeStore.set(null);
      } else {
        shapeStore.set(scene.shape as GeoJSON.Polygon);
        bboxStore.set(null);
      }
  }

  if (scene.route) {
    const wps = scene.route.waypoints.map((w) => ({
      id: Math.random().toString(36).slice(2),
      address: w.a,
      coord: w.c
    }));
    routeStore.set({ waypoints: wps, route: scene.route.line || null });
    pathStore.set(scene.route.line || null);
    if (scene.route.line) await loadModelForRoute(scene.route.line);
  }

  if (scene.view) {
    viewModeStore.set(scene.view.mode);
    const applyView = (m: any) => {
      m.jumpTo({
        center: scene.view!.map.center,
        zoom: scene.view!.map.zoom,
        bearing: scene.view!.map.bearing,
        pitch: scene.view!.map.pitch
      });
    };
    const map = get(mapStore);
    if (map) applyView(map);
    else {
      const unsub = mapStore.subscribe((m) => {
        if (m) {
          applyView(m);
          unsub();
        }
      });
    }
  }
  applying = false;
}

export function debouncedWrite() {
  if (!browser || applying) return;
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    const s = serialize(collectCurrentState());
    writeToUrl(s, true);
  }, 1000);
}

export function isApplying() {
  return applying;
}
