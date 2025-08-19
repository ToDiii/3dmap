<script lang="ts">
import '../app.css';
import favicon from '$lib/assets/favicon.svg';
import { onMount } from 'svelte';
import { updateAvailable, initPWA, skipWaiting } from '$lib/pwa';
import { readFromUrl } from '$lib/state/url';
import { deserialize } from '$lib/state/serialize';
import { applyState, debouncedWrite } from '$lib/state/bridge';
import { modelConfigStore } from '$lib/stores/modelConfigStore';
import { bboxStore } from '$lib/stores/bboxStore';
import { shapeStore } from '$lib/stores/shapeStore';
import { routeStore } from '$lib/stores/routeStore';
import { layerStore } from '$lib/stores/layerStore';
import { viewModeStore } from '$lib/stores/viewModeStore';
import { mapStore } from '$lib/stores/map';
import { browser } from '$app/environment';
let { children } = $props();
onMount(async () => {
  initPWA();
  if (!browser) return;
  const raw = readFromUrl();
  if (raw) {
    const st = deserialize(raw);
    if (st) {
      try {
        await applyState(st);
      } catch (e) {
        console.error('apply state failed', e);
      }
    } else {
      console.warn('Ungültiger Link-State');
    }
  }
  modelConfigStore.subscribe(() => debouncedWrite());
  bboxStore.subscribe(() => debouncedWrite());
  shapeStore.subscribe(() => debouncedWrite());
  routeStore.subscribe(() => debouncedWrite());
  layerStore.subscribe(() => debouncedWrite());
  viewModeStore.subscribe(() => debouncedWrite());
  mapStore.subscribe((m) => {
    if (m) m.on('moveend', debouncedWrite);
  });
});
function reload() {
  skipWaiting();
}
</script>
<svelte:head>
<link rel="icon" href={favicon} />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="apple-touch-icon" sizes="180x180" href="/icons-gen/apple-touch-icon-180.png" />
<meta name="theme-color" content="#111111" />
</svelte:head>
{@render children?.()}
{#if $updateAvailable}
  <div class="pwa-toast">Update verfügbar — <button on:click={reload}>Neu laden</button></div>
{/if}
<style>
  .pwa-toast {
    position: fixed;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: #fff;
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }
  .pwa-toast button {
    margin-left: 0.5rem;
    background: #555;
    color: #fff;
    padding: 0.2rem 0.5rem;
    border: none;
    border-radius: 3px;
  }
</style>
