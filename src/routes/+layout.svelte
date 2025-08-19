<script lang="ts">
import '../app.css';
import favicon from '$lib/assets/favicon.svg';
import { onMount } from 'svelte';
import { updateAvailable, initPWA, skipWaiting } from '$lib/pwa';
let { children } = $props();
onMount(() => {
  initPWA();
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
