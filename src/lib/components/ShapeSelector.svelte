<script lang="ts">
  import { onMount } from 'svelte';
  import { mapStore } from '$lib/stores/map';
  import { shapeStore } from '$lib/stores/shapeStore';
  import { LngLatBounds, type Map as MaplibreMap, type MapMouseEvent } from 'maplibre-gl';
  import { onMapLoaded } from '$lib/utils/map';

  let map: MaplibreMap | undefined;
  let isDrawing = false;
  let start: [number, number] | null = null;
  let drawingMode: 'rect' | 'circle' | null = null;

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
      const source = m.getSource('shape') as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(data);
      } else {
        m.addSource('shape', { type: 'geojson', data });
        m.addLayer({
          id: 'shape-fill',
          type: 'fill',
          source: 'shape',
          paint: { 'fill-color': '#088', 'fill-opacity': 0.1 }
        });
        m.addLayer({
          id: 'shape-line',
          type: 'line',
          source: 'shape',
          paint: { 'line-color': '#088', 'line-width': 2 }
        });
      }
    };
    onMapLoaded(m, run);
  }

  function clearShape() {
    if (!map) return;
    if (map.getLayer('shape-fill')) map.removeLayer('shape-fill');
    if (map.getLayer('shape-line')) map.removeLayer('shape-line');
    if (map.getSource('shape')) map.removeSource('shape');
    shapeStore.set(null);
  }

  function circleToPolygon(center: [number, number], radius: number, steps = 64): GeoJSON.Polygon {
    const coords: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const ang = (i / steps) * Math.PI * 2;
      coords.push([center[0] + radius * Math.cos(ang), center[1] + radius * Math.sin(ang)]);
    }
    return { type: 'Polygon', coordinates: [coords] };
  }

  function startDrawing(mode: 'rect' | 'circle') {
    if (!map) return;
    drawingMode = mode;
    isDrawing = true;
    map.getCanvas().style.cursor = 'crosshair';

    const onMouseDown = (e: MapMouseEvent) => {
      start = [e.lngLat.lng, e.lngLat.lat];
      map!.dragPan.disable();

      const onMove = (ev: MapMouseEvent) => {
        if (!start) return;
        if (drawingMode === 'rect') {
          const bounds = new LngLatBounds(start, [ev.lngLat.lng, ev.lngLat.lat]);
          updateSource(boundsToPolygon(bounds));
        } else {
          const r = Math.max(
            Math.abs(ev.lngLat.lng - start[0]),
            Math.abs(ev.lngLat.lat - start[1])
          );
          updateSource(circleToPolygon(start, r));
        }
      };

      const onUp = (ev: MapMouseEvent) => {
        if (!start) return;
        let poly: GeoJSON.Polygon;
        if (drawingMode === 'rect') {
          const bounds = new LngLatBounds(start, [ev.lngLat.lng, ev.lngLat.lat]);
          poly = boundsToPolygon(bounds);
        } else {
          const r = Math.max(
            Math.abs(ev.lngLat.lng - start[0]),
            Math.abs(ev.lngLat.lat - start[1])
          );
          poly = circleToPolygon(start, r);
        }
        updateSource(poly);
        shapeStore.set(poly);
        map!.getCanvas().style.cursor = '';
        map!.off('mousemove', onMove);
        map!.off('mouseup', onUp);
        map!.dragPan.enable();
        isDrawing = false;
        drawingMode = null;
      };

      map!.on('mousemove', onMove);
      map!.on('mouseup', onUp);
    };

    map.once('mousedown', onMouseDown);
  }

  const startRectangle = () => startDrawing('rect');
  const startCircle = () => startDrawing('circle');

  onMount(() => {
    const unsubscribe = mapStore.subscribe((m) => {
      map = m;
    });
    return () => unsubscribe();
  });
</script>

<div class="space-y-2">
  <button class="px-2 py-1 bg-blue-500 text-white rounded" on:click={startRectangle} disabled={isDrawing}>
    Rechteck zeichnen
  </button>
  <button class="px-2 py-1 bg-green-500 text-white rounded" on:click={startCircle} disabled={isDrawing}>
    Kreis zeichnen
  </button>
  <button class="px-2 py-1 bg-gray-300 rounded" on:click={clearShape}>
    Löschen
  </button>
</div>
