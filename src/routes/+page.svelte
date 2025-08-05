<script lang="ts">
  import {
    Map,
    LayerControl,
    GpxUpload,
    PathEditor,
    ModelControls,
    Viewer,
    BBoxEditor,
    ShapeSelector,
    MapExport,
    ProjectIO
  } from '$lib';
  import type maplibregl from 'maplibre-gl';
  let map: maplibregl.Map | undefined;
  let showViewer = false;
</script>

  <div class="flex w-full h-screen">
    <aside class="w-64 p-4 bg-white/80 overflow-y-auto space-y-4">
      <GpxUpload />
      <LayerControl />
      <PathEditor />
      <BBoxEditor />
      <ShapeSelector />
      <ModelControls />
      <ProjectIO />
      <MapExport />
      <button
        class="w-full p-2 bg-blue-600 text-white"
        on:click={() => (showViewer = !showViewer)}
      >
        {showViewer ? '2D Karte' : '3D Ansicht'}
      </button>
    </aside>
    <div class="flex-1 relative">
      {#if showViewer}
        <Viewer />
      {:else}
        <Map bind:map />
      {/if}
    </div>
  </div>
