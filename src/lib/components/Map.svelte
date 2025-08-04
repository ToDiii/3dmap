<script lang="ts">
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { onMount } from 'svelte';
  import { mapStore } from '$lib/stores/map';

  // Allow external binding to map instance for dynamic layer control
  export let map: maplibregl.Map | undefined;

  // Style URL can be swapped via env var or prop
  const DEFAULT_STYLE = 'https://demotiles.maplibre.org/style.json';
  export let styleUrl: string = import.meta.env.VITE_MAP_STYLE_URL ?? DEFAULT_STYLE;

  // Default view centered on Munich
  export let center: [number, number] = [11.576124, 48.137154];
  export let zoom: number = 5;

  let mapContainer: HTMLDivElement;

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: styleUrl,
      center,
      zoom
    });

    // expose map instance via store for other components
    mapStore.set(map);

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl());

    return () => {
      mapStore.set(undefined);
      map?.remove();
    };
  });
</script>

<div bind:this={mapContainer} class="w-full h-full"></div>
