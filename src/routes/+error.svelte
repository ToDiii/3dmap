<script lang="ts">
	import { page } from '$app/stores';
	import { dev } from '$app/environment';
	function reload() {
		location.reload();
	}
</script>

<svelte:head>
	<title>{$page.status} – Fehler</title>
</svelte:head>

<main class="error-page">
	<h1>{$page.status}</h1>
	{#if $page.error}
		<p>{$page.error.message}</p>
		{#if dev && $page.error.stack}
			<pre>{$page.error.stack}</pre>
		{/if}
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
