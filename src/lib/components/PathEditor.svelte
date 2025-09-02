<script lang="ts">
	import type { LineString } from 'geojson';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type MapboxDraw from 'maplibre-gl-draw';
	import type { Map } from 'maplibre-gl';
	import { mapStore } from '$lib/stores/map';
	import { pathStore } from '$lib/stores/pathStore';

	let Draw: typeof MapboxDraw;
	let draw: MapboxDraw | null = null;
	let map: Map | undefined;

	if (browser) {
		import('maplibre-gl-draw').then(async (mod) => {
			Draw = mod.default;
			await import('maplibre-gl-draw/dist/mapbox-gl-draw.css');
			if (map && !draw) {
				initialize(map);
			}
		});
	}

	function initialize(m: Map) {
		draw = new Draw({
			displayControlsDefault: false,
			defaultMode: 'draw_line_string',
		});
		(m as any).addControl(draw);

		const syncPath = () => {
			const data = draw!.getAll();
			if (data.features.length > 0) {
				pathStore.set(data.features[0].geometry as LineString);
			} else {
				pathStore.set(null);
			}
		};

		m.on('draw.create', (e) => {
			const id = e.features[0].id as string;
			const all = draw!.getAll().features;
			all.forEach((f) => {
				if (f.id !== id) draw!.delete(f.id as string);
			});
			syncPath();
		});
		m.on('draw.update', syncPath);
		m.on('draw.delete', syncPath);
		m.on('draw.modechange', (e) => {
			if (e.mode === 'draw_line_string') {
				draw!.deleteAll();
				pathStore.set(null);
			}
		});
	}

	function startNewPath() {
		if (!draw) return;
		draw.deleteAll();
		pathStore.set(null);
		draw.changeMode('draw_line_string');
	}

	function deletePath() {
		if (!draw) return;
		draw.deleteAll();
		pathStore.set(null);
	}

	onMount(() => {
		const unsubscribe = mapStore.subscribe((m) => {
			map = m;
			if (map && !draw && Draw) {
				initialize(map);
			}
		});

		return () => {
			unsubscribe();
			if (map && draw) {
				(map as any).removeControl(draw);
			}
			draw = null;
		};
	});
</script>

<div class="space-y-2">
	<button class="rounded bg-blue-500 px-2 py-1 text-white" on:click={startNewPath}>
		Neuen Pfad zeichnen
	</button>
	<button class="rounded bg-red-500 px-2 py-1 text-white" on:click={deletePath}>
		Pfad löschen
	</button>
</div>
