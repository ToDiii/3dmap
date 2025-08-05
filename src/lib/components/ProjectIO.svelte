<script lang="ts">
  import { exportProject, importProject, resetProject } from '$lib/utils/projectIO';
  let fileInput: HTMLInputElement;
  let resetNotice = '';
  let noticeTimer: ReturnType<typeof setTimeout> | null = null;

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

  function handleReset() {
    resetProject();
    resetNotice = 'Projekt wurde zurückgesetzt.';
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => (resetNotice = ''), 2000);
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
  <button class="w-full p-2 bg-red-600 text-white" on:click={handleReset}>
    🗑️ Projekt zurücksetzen
  </button>
  {#if resetNotice}
    <div class="text-sm text-green-700">{resetNotice}</div>
  {/if}
</div>
