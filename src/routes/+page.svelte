<script lang="ts">
  import { Map, LayerControl } from '$lib';
  import type maplibregl from 'maplibre-gl';
  let map: maplibregl.Map | undefined;
</script>

<div class="flex w-full h-screen">
  <aside class="w-64 p-4 bg-white/80 overflow-y-auto">
    <LayerControl />
  </aside>
  <div class="flex-1">
    <Map bind:map />
  </div>
</div>
