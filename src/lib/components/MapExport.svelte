<script lang="ts">
  import { get } from 'svelte/store';
  import { extrudeGroupStore } from '$lib/stores/extrudeGroupStore';
  import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
  import { exportTo3MF } from 'three-3mf-exporter';
  import type { Group } from 'three';

  let exportMessage: string | null = null;

  function downloadBlob(blob: Blob, ext: string) {
    const timestamp = Date.now();
    const filename = `osm-model_${timestamp}.${ext}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    exportMessage = 'Datei wurde heruntergeladen';
    setTimeout(() => (exportMessage = null), 2000);
  }

  function exportSTL() {
    const group = get(extrudeGroupStore);
    if (!group || group.children.length === 0) {
      exportMessage = 'Kein exportierbares Modell gefunden';
      setTimeout(() => (exportMessage = null), 2000);
      return;
    }
    const exporter = new STLExporter();
    const result = exporter.parse(group, { binary: true }) as DataView;
    const blob = new Blob([result.buffer], { type: 'model/stl' });
    downloadBlob(blob, 'stl');
  }

  async function export3MF() {
    const group = get(extrudeGroupStore);
    if (!group || group.children.length === 0) {
      exportMessage = 'Kein exportierbares Modell gefunden';
      setTimeout(() => (exportMessage = null), 2000);
      return;
    }
    const blob = await exportTo3MF(group as Group);
    downloadBlob(blob, '3mf');
  }
</script>

<div class="space-y-2">
  <button class="w-full p-2 bg-blue-600 text-white" on:click={exportSTL}>
    Export als STL
  </button>
  <button class="w-full p-2 bg-blue-600 text-white" on:click={export3MF}>
    Export als 3MF
  </button>
  {#if exportMessage}
    <div class="text-sm mt-2">{exportMessage}</div>
  {/if}
</div>
