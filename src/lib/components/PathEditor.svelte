<script lang="ts">
  import { onMount } from 'svelte';
  import MapboxDraw from 'maplibre-gl-draw';
  import 'maplibre-gl-draw/dist/mapbox-gl-draw.css';
  import type { Map } from 'maplibre-gl';
  import { mapStore } from '$lib/stores/map';
  import { pathStore } from '$lib/stores/pathStore';

  let draw: MapboxDraw | null = null;
  let map: Map | undefined;

  function initialize(m: Map) {
    draw = new MapboxDraw({
      displayControlsDefault: false,
      defaultMode: 'draw_line_string'
    });
    (m as any).addControl(draw);

    const syncPath = () => {
      const data = draw!.getAll();
      if (data.features.length > 0) {
        pathStore.set(data.features[0].geometry as GeoJSON.LineString);
      } else {
        pathStore.set(null);
      }
    };

    m.on('draw.create', (e) => {
      const id = e.features[0].id as string;
      const all = draw!.getAll().features;
      all.forEach((f) => {
        if (f.id !== id) draw!.delete(f.id as string);
      });
      syncPath();
    });
    m.on('draw.update', syncPath);
    m.on('draw.delete', syncPath);
    m.on('draw.modechange', (e) => {
      if (e.mode === 'draw_line_string') {
        draw!.deleteAll();
        pathStore.set(null);
      }
    });
  }

  function startNewPath() {
    if (!draw) return;
    draw.deleteAll();
    pathStore.set(null);
    draw.changeMode('draw_line_string');
  }

  onMount(() => {
    const unsubscribe = mapStore.subscribe((m) => {
      map = m;
      if (map && !draw) {
        initialize(map);
      }
    });

    return () => {
      unsubscribe();
      if (map && draw) {
        (map as any).removeControl(draw);
      }
      draw = null;
    };
  });
</script>

<div class="space-y-2">
  <button class="px-2 py-1 bg-blue-500 text-white rounded" on:click={startNewPath}>
    Neuen Pfad zeichnen
  </button>
</div>
