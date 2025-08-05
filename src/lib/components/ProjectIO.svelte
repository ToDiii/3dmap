<script lang="ts">
  import { exportProject, importProject } from '$lib/utils/projectIO';
  let fileInput: HTMLInputElement;

  function triggerImport() {
    fileInput.click();
  }

  async function handleFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      await importProject(file);
    }
    (event.target as HTMLInputElement).value = '';
  }
</script>

<div class="space-y-2">
  <input
    type="file"
    accept=".3dmap.json"
    class="hidden"
    bind:this={fileInput}
    on:change={handleFileChange}
  />
  <button class="w-full p-2 bg-blue-600 text-white" on:click={triggerImport}>
    📥 Laden
  </button>
  <button class="w-full p-2 bg-blue-600 text-white" on:click={exportProject}>
    📤 Speichern
  </button>
</div>
