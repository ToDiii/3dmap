<script lang="ts">
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { onMount } from 'svelte';
  import { mapStore } from '$lib/stores/map';
  import { shapeStore } from '$lib/stores/shapeStore';
  import { modelConfigStore } from '$lib/stores/modelConfigStore';
  import { extrudeGroupStore } from '$lib/stores/extrudeGroupStore';
  import { get } from 'svelte/store';
  import * as THREE from 'three';

  // Allow external binding to map instance for dynamic layer control
  export let map: maplibregl.Map | undefined;

  // Style URL can be swapped via env var or prop
  const DEFAULT_STYLE = 'https://demotiles.maplibre.org/style.json';
  export let styleUrl: string = import.meta.env.VITE_MAP_STYLE_URL ?? DEFAULT_STYLE;

  // Default view centered on Munich
  export let center: [number, number] = [11.576124, 48.137154];
  export let zoom: number = 5;

  let mapContainer: HTMLDivElement;
  let extrudeGroup: THREE.Group = new THREE.Group();
  extrudeGroupStore.set(extrudeGroup);
  let fetchTimer: ReturnType<typeof setTimeout> | null = null;
  let layerReady = false;

  function polygonToBBox(poly: GeoJSON.Polygon): [number, number, number, number] {
    const coords = poly.coordinates[0];
    let minLon = Infinity,
      minLat = Infinity,
      maxLon = -Infinity,
      maxLat = -Infinity;
    for (const [lon, lat] of coords) {
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
    }
    return [minLat, minLon, maxLat, maxLon];
  }

  function clearGroup(group: THREE.Group) {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          (obj.material as THREE.Material).dispose();
        }
      }
    });
    group.clear();
  }

  function renderExtrudedBuildings(features: any[] = []) {
    clearGroup(extrudeGroup);
    if (!features || features.length === 0) {
      map?.triggerRepaint();
      return;
    }
    for (const f of features) {
      const pts: [number, number][] = f.geometry?.map((c: number[]) => [c[0], c[2]]);
      if (!pts || pts.length < 3) continue;
      const shape = new THREE.Shape();
      pts.forEach(([lng, lat], idx) => {
        const mc = maplibregl.MercatorCoordinate.fromLngLat({ lng, lat });
        if (idx === 0) shape.moveTo(mc.x, mc.y);
        else shape.lineTo(mc.x, mc.y);
      });
      const base = f.geometry?.[0]?.[1] ?? 0;
      const extrudeHeight = (f.height ?? base) - base;
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: extrudeHeight,
        bevelEnabled: false
      });
      const mat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.z = base;
      extrudeGroup.add(mesh);
    }
    map?.triggerRepaint();
  }

  async function loadBuildings(shape: GeoJSON.Polygon | null) {
    if (!shape) {
      renderExtrudedBuildings([]);
      return;
    }
    const bbox = polygonToBBox(shape);
    const cfg = get(modelConfigStore);
    try {
      const res = await fetch('/api/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elements: ['buildings'],
          scale: 1,
          baseHeight: cfg.baseHeight,
          buildingMultiplier: cfg.buildingMultiplier,
          minArea: cfg.excludeSmallBuildings ? cfg.minBuildingArea : undefined,
          bbox
        })
      });
      const data = await res.json();
      renderExtrudedBuildings(data?.features ?? []);
    } catch (err) {
      console.error('failed to fetch model', err);
      renderExtrudedBuildings([]);
    }
  }

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: styleUrl,
      center,
      zoom
    });

    map.on('style.load', () => {
      // expose map instance via store for other components
      mapStore.set(map!);

      map!.addControl(new maplibregl.NavigationControl(), 'top-right');
      map!.addControl(new maplibregl.ScaleControl());

      const customLayer = {
        id: 'extruded-buildings',
        type: 'custom' as const,
        renderingMode: '3d' as const,
        onAdd: function (_map: maplibregl.Map, gl: WebGLRenderingContext) {
          const renderer = new THREE.WebGLRenderer({
            canvas: _map.getCanvas(),
            context: gl
          });
          renderer.autoClear = false;
          ;(this as any).renderer = renderer;
          ;(this as any).scene = new THREE.Scene();
          ;(this as any).camera = new THREE.Camera();
          ;(this as any).scene.add(extrudeGroup);
        },
        render: function (gl: WebGLRenderingContext, matrix: number[]) {
          const camera = (this as any).camera as THREE.Camera;
          const scene = (this as any).scene as THREE.Scene;
          const renderer = (this as any).renderer as THREE.WebGLRenderer;
          camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);
          renderer.resetState();
          renderer.render(scene, camera);
        }
      };
      map!.addLayer(customLayer as any);
      layerReady = true;
      loadBuildings(get(shapeStore));
    });

    const unsubShape = shapeStore.subscribe((shape) => {
      if (!layerReady) return;
      if (fetchTimer) clearTimeout(fetchTimer);
      fetchTimer = setTimeout(() => loadBuildings(shape), 300);
    });
    const unsubCfg = modelConfigStore.subscribe(() => {
      if (!layerReady) return;
      if (fetchTimer) clearTimeout(fetchTimer);
      fetchTimer = setTimeout(() => loadBuildings(get(shapeStore)), 300);
    });

    return () => {
      unsubShape();
      unsubCfg();
      mapStore.set(undefined);
      extrudeGroupStore.set(null);
      map?.remove();
    };
  });
</script>

<div bind:this={mapContainer} class="w-full h-full"></div>
