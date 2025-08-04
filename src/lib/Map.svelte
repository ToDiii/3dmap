<script lang="ts">
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { onMount } from 'svelte';
  let map: maplibregl.Map;
  let mapContainer: HTMLDivElement;
  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [0, 0],
      zoom: 1
    });
    return () => map.remove();
  });
</script>
<div bind:this={mapContainer} class="w-full h-full"></div>
