<script lang="ts">
  import { onMount } from 'svelte';
  import { mapStore } from '$lib/stores/map';
  import { bboxStore } from '$lib/stores/bboxStore';
  import { LngLatBounds, type Map as MaplibreMap, type MapMouseEvent } from 'maplibre-gl';
  import { onMapLoaded } from '$lib/utils/map';

  let map: MaplibreMap | undefined;
  let isDrawing = false;
  let start: [number, number] | null = null;

  function boundsToPolygon(bounds: LngLatBounds): GeoJSON.Polygon {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const nw = { lng: sw.lng, lat: ne.lat };
    const se = { lng: ne.lng, lat: sw.lat };
    return {
      type: 'Polygon',
      coordinates: [
        [
          [sw.lng, sw.lat],
          [nw.lng, nw.lat],
          [ne.lng, ne.lat],
          [se.lng, se.lat],
          [sw.lng, sw.lat]
        ]
      ]
    };
  }

  function updateSource(poly: GeoJSON.Polygon) {
    if (!map) return;
    const m = map;
    const run = () => {
      const data: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: 'Feature',
        geometry: poly,
        properties: {}
      };
      const source = m.getSource('bbox') as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(data);
      } else {
        m.addSource('bbox', { type: 'geojson', data });
        m.addLayer({
          id: 'bbox-fill',
          type: 'fill',
          source: 'bbox',
          paint: { 'fill-color': '#088', 'fill-opacity': 0.1 }
        });
        m.addLayer({
          id: 'bbox-line',
          type: 'line',
          source: 'bbox',
          paint: { 'line-color': '#088', 'line-width': 2 }
        });
      }
    };
    onMapLoaded(m, run);
  }

  function clearBox() {
    if (!map) return;
    if (map.getLayer('bbox-fill')) map.removeLayer('bbox-fill');
    if (map.getLayer('bbox-line')) map.removeLayer('bbox-line');
    if (map.getSource('bbox')) map.removeSource('bbox');
    bboxStore.set(null);
  }

  function startDrawing() {
    if (!map) return;
    isDrawing = true;
    map.getCanvas().style.cursor = 'crosshair';

    const onMouseDown = (e: MapMouseEvent) => {
      start = [e.lngLat.lng, e.lngLat.lat];
      map!.dragPan.disable();

      const onMove = (ev: MapMouseEvent) => {
        const bounds = new LngLatBounds(start!, [ev.lngLat.lng, ev.lngLat.lat]);
        updateSource(boundsToPolygon(bounds));
      };

      const onUp = (ev: MapMouseEvent) => {
        const bounds = new LngLatBounds(start!, [ev.lngLat.lng, ev.lngLat.lat]);
        updateSource(boundsToPolygon(bounds));
        bboxStore.set([
          bounds.getSouth(),
          bounds.getWest(),
          bounds.getNorth(),
          bounds.getEast()
        ]);
        map!.getCanvas().style.cursor = '';
        map!.off('mousemove', onMove);
        map!.off('mouseup', onUp);
        map!.dragPan.enable();
        isDrawing = false;
      };

      map!.on('mousemove', onMove);
      map!.on('mouseup', onUp);
    };

    map.once('mousedown', onMouseDown);
  }

  onMount(() => {
    const unsubscribe = mapStore.subscribe((m) => {
      map = m;
    });
    return () => unsubscribe();
  });
</script>

<div class="space-y-2">
  <button class="px-2 py-1 bg-blue-500 text-white rounded" on:click={startDrawing} disabled={isDrawing}>
    Rechteck zeichnen
  </button>
  <button class="px-2 py-1 bg-gray-300 rounded" on:click={clearBox}>
    Löschen
  </button>
</div>
