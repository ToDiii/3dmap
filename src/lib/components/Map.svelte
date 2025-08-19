<script lang="ts">
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { onMount } from 'svelte';
  import { mapStore } from '$lib/stores/map';
  import { extrudeGroupStore } from '$lib/stores/extrudeGroupStore';
  import { modelGeo } from '$lib/stores/modelGeoStore';
  import { modelError } from '$lib/stores/modelStore';
  import { pathStore } from '$lib/stores/pathStore';
  import * as THREE from 'three';
  import { COLORS } from '$lib/constants/palette';
  import { getBuildingMaterial, disposeBuildingMaterials } from '$lib/three/materials';

  export let map: maplibregl.Map | undefined;

  const DEFAULT_STYLE = 'https://demotiles.maplibre.org/style.json';
  export let styleUrl: string = import.meta.env.VITE_MAP_STYLE_URL ?? DEFAULT_STYLE;

  export let center: [number, number] = [11.576124, 48.137154];
  export let zoom: number = 5;

  let mapContainer: HTMLDivElement;
  let extrudeGroup: THREE.Group = new THREE.Group();
  extrudeGroupStore.set(extrudeGroup);
  const routeSourceId = 'route-preview';
  const routeLayerId = 'route-preview-line';
  let unsubRoute: (() => void) | null = null;
  let unsubGeo: (() => void) | null = null;
  let unsubErr: (() => void) | null = null;
  let toastMessage: string | null = null;

  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

  function clearGroup(group: THREE.Group, disposeMaterials = false) {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (disposeMaterials) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            (obj.material as THREE.Material).dispose();
          }
        }
      }
    });
    group.clear();
  }

  function renderExtrudedBuildings(features: GeoJSON.Feature[] = []) {
    clearGroup(extrudeGroup);
    if (!features || features.length === 0) {
      map?.triggerRepaint();
      return;
    }
    for (const f of features) {
      if (f.geometry.type !== 'Polygon') continue;
      const pts = f.geometry.coordinates[0];
      if (!pts || pts.length < 3) continue;
      const shape = new THREE.Shape();
      pts.forEach(([lng, lat], idx) => {
        const mc = maplibregl.MercatorCoordinate.fromLngLat({ lng, lat });
        if (idx === 0) shape.moveTo(mc.x, mc.y);
        else shape.lineTo(mc.x, mc.y);
      });
      const base = (f.properties?.base_height as number) ?? 0;
      const extrudeHeight = ((f.properties?.height_final as number) ?? base) - base;
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: extrudeHeight,
        bevelEnabled: false
      });
      const subtype = f.properties?.subtype || 'building_residential';
      const mat = getBuildingMaterial(subtype);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.z = base;
      extrudeGroup.add(mesh);
    }
    map?.triggerRepaint();
  }

  function ensureLayers() {
    if (!map) return;
    if (!map.getSource('model-geo')) {
      map.addSource('model-geo', { type: 'geojson', data: emptyFC });
    }
    if (!map.getLayer('extrude-buildings')) {
      map.addLayer({
        id: 'extrude-buildings',
        type: 'fill-extrusion',
        source: 'model-geo',
        filter: ['==', ['get', 'featureType'], 'building'],
        paint: {
          'fill-extrusion-color': [
            'match',
            ['get', 'subtype'],
            'building_commercial',
            COLORS.building_commercial,
            'building_industrial',
            COLORS.building_industrial,
            'building_residential',
            COLORS.building_residential,
            COLORS.building_residential
          ],
          'fill-extrusion-opacity': 0.9,
          'fill-extrusion-height': ['get', 'height_final'],
          'fill-extrusion-base': ['get', 'base_height']
        }
      });
    }
    if (!map.getLayer('model-water')) {
      map.addLayer({
        id: 'model-water',
        type: 'fill',
        source: 'model-geo',
        filter: ['==', ['get', 'featureType'], 'water'],
        paint: { 'fill-color': COLORS.water, 'fill-opacity': 0.5 }
      });
    }
    if (!map.getLayer('model-green')) {
      map.addLayer({
        id: 'model-green',
        type: 'fill',
        source: 'model-geo',
        filter: ['==', ['get', 'featureType'], 'green'],
        paint: { 'fill-color': COLORS.green, 'fill-opacity': 0.5 }
      });
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
      mapStore.set(map!);
      map!.addControl(new maplibregl.NavigationControl(), 'top-right');
      map!.addControl(new maplibregl.ScaleControl());
      ensureLayers();
      (window as any).__map = map;

      unsubGeo = modelGeo.subscribe((geo) => {
        const src = map!.getSource('model-geo') as maplibregl.GeoJSONSource;
        src.setData(geo || emptyFC);
        ensureLayers();
        const buildingFeatures =
          geo?.features.filter((f) => f.properties?.featureType === 'building') || [];
        renderExtrudedBuildings(buildingFeatures);
        if (geo && geo.features.length === 0) {
          toastMessage = 'Keine OSM-Gebäude im gewählten Bereich.';
          setTimeout(() => (toastMessage = null), 2000);
        }
      });

      unsubErr = modelError.subscribe((err) => {
        if (err) {
          toastMessage = err;
          setTimeout(() => (toastMessage = null), 2000);
        }
      });

      unsubRoute = pathStore.subscribe((line) => {
        if (!map) return;
        if (line) {
          const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
            type: 'Feature',
            geometry: line,
            properties: {}
          };
          const src = map.getSource(routeSourceId) as maplibregl.GeoJSONSource | undefined;
          if (src) src.setData(geojson);
          else map.addSource(routeSourceId, { type: 'geojson', data: geojson });
          if (!map.getLayer(routeLayerId)) {
            map.addLayer({
              id: routeLayerId,
              type: 'line',
              source: routeSourceId,
              paint: { 'line-color': COLORS.route, 'line-width': 4 }
            });
          }
        } else {
          if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId);
          if (map.getSource(routeSourceId)) map.removeSource(routeSourceId);
        }
      });
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
      map.on('mousemove', (e) => {
        const feats = map!.queryRenderedFeatures(e.point, {
          layers: ['extrude-buildings', 'model-water', 'model-green']
        });
        if (feats.length === 0) {
          popup.remove();
          return;
        }
        const f = feats[0];
        const p: any = f.properties || {};
        let html = '';
        if (p.name) html += `<strong>${p.name}</strong><br/>`;
        if (p.subtype) html += `${p.subtype}<br/>`;
        if (p.height_final)
          html += `Höhe: ${Number(p.height_final).toFixed(1)} m<br/>`;
        if (p.levels) html += `Stockwerke: ${p.levels}<br/>`;
        else if (p.height) html += `Höhe Tag: ${p.height}<br/>`;
        popup.setLngLat(e.lngLat).setHTML(html).addTo(map!);
      });
    });

    return () => {
      if (unsubGeo) unsubGeo();
      if (unsubErr) unsubErr();
      if (unsubRoute) unsubRoute();
      mapStore.set(undefined);
      extrudeGroupStore.set(null);
      map?.remove();
      disposeBuildingMaterials();
    };
  });
</script>

<div bind:this={mapContainer} class="w-full h-full relative">
  {#if toastMessage}
    <div class="absolute top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white px-2 py-1 rounded text-sm">
      {toastMessage}
    </div>
  {/if}
</div>
