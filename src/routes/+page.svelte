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
		ProjectIO,
		Legend,
		ShareLink,
		SettingsModal,
	} from '$lib';
	import { modelMeta, invalidateModel } from '$lib/stores/modelStore';
	import type maplibregl from 'maplibre-gl';
	import { viewModeStore } from '$lib/stores/viewModeStore';
	let map: maplibregl.Map | undefined;
	let showLegend = true;
	let settingsOpen = false;
</script>

<div class="flex h-screen w-full">
	<aside class="w-64 space-y-4 overflow-y-auto bg-white/80 p-4">
		<GpxUpload />
		<LayerControl />
		<PathEditor />
		<BBoxEditor />
		<ShapeSelector />
		<ModelControls />
		<ProjectIO />
		<ShareLink />
		<MapExport />
		<button class="w-full bg-gray-200 p-2" on:click={() => (settingsOpen = true)}
			>Einstellungen</button
		>
		<label class="flex items-center gap-2">
			<input type="checkbox" bind:checked={showLegend} /> Legende anzeigen
		</label>
		{#if showLegend}
			<Legend />
		{/if}
		<button
			class="w-full bg-blue-600 p-2 text-white"
			on:click={() => viewModeStore.update((m) => (m === 'map' ? 'viewer' : 'map'))}
		>
			{$viewModeStore === 'viewer' ? '2D Karte' : '3D Ansicht'}
		</button>
		{#if $modelMeta}
			<details class="mt-4 text-sm">
				<summary>Overpass Debug</summary>
				<div class="space-y-1">
					<div>Endpoint: {$modelMeta.endpoint}</div>
					<div>Dauer: {$modelMeta.durationMs}ms</div>
					<div>Tiles: {$modelMeta.tiles}</div>
					<div>Cache: {$modelMeta.cache}</div>
				</div>
				<button class="mt-2 w-full bg-gray-200 p-2" on:click={invalidateModel}>
					Erneut versuchen (Invalidate Cache)
				</button>
				{#if $modelMeta.tiles > 1}
					<div class="mt-2 text-xs">Großes Gebiet, Daten in {$modelMeta.tiles} Kacheln geladen</div>
				{/if}
			</details>
		{/if}
	</aside>
	<div class="relative flex-1">
		{#if $viewModeStore === 'viewer'}
			<Viewer />
		{:else}
			<Map bind:map />
		{/if}
	</div>
</div>
<SettingsModal bind:open={settingsOpen} />
