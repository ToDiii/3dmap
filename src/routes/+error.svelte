<script lang="ts">
import { dev } from '$app/environment';
export let status: number;
export let error: Error;
function reload() { location.reload(); }
</script>

<svelte:head>
  <title>{status} – Fehler</title>
</svelte:head>

<main class="error-page">
  <h1>{status}</h1>
  <p>{error.message}</p>
  {#if dev && error.stack}
    <pre>{error.stack}</pre>
  {/if}
  <div class="actions">
    <button on:click={reload}>Neu laden</button>
    <a href="/">Zur Karte</a>
    <a href="https://github.com/3dmap/3dmap/issues" target="_blank" rel="noopener">Fehler melden</a>
  </div>
</main>

<style>
  .error-page {
    max-width: 40rem;
    margin: 2rem auto;
    padding: 1rem;
    text-align: center;
  }
  .actions {
    margin-top: 1rem;
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  pre {
    text-align: left;
    overflow: auto;
    background: #f5f5f5;
    padding: 1rem;
  }
</style>
