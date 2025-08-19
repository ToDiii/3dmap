<script lang="ts">
  import { settingsStore } from '$lib/stores/settingsStore';
  import { TELEMETRY_ENABLED, SENTRY_DSN } from '$lib/config/env';
  export let open = false;
  const canToggle = TELEMETRY_ENABLED && !!SENTRY_DSN;
  function close() {
    open = false;
  }
</script>
{#if open}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div class="bg-white p-4 w-80 space-y-4">
      <h2 class="text-lg font-bold">Einstellungen</h2>
      <label class="flex items-center gap-2">
        <input type="checkbox" bind:checked={$settingsStore.telemetryConsent} disabled={!canToggle} />
        Fehler-Telemetrie &amp; Performance-Metriken senden
      </label>
      <p class="text-sm">
        Mehr Infos in <a href="/PRIVACY.md" class="underline" target="_blank">PRIVACY.md</a>
      </p>
      {#if !canToggle}
        <p class="text-xs text-red-600">Telemetrie nicht verfügbar.</p>
      {/if}
      <button class="mt-2 p-2 bg-gray-200" on:click={close}>Schließen</button>
    </div>
  </div>
{/if}
