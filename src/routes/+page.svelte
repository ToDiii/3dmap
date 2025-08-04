<script lang="ts">
  import { Map } from '$lib';
  import type maplibregl from 'maplibre-gl';
  let map: maplibregl.Map | undefined;
</script>

<div class="w-full h-screen">
  <Map bind:map />
</div>
