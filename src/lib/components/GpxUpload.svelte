<script lang="ts">
	import type { Feature, FeatureCollection, LineString } from 'geojson';
	import { get } from 'svelte/store';
	import maplibregl from 'maplibre-gl';
	import { gpx } from '@tmcw/togeojson';
	import { browser } from '$app/environment';
	import { mapStore } from '$lib/stores/map';
	import { pathStore } from '$lib/stores/pathStore';
	import { onMapLoaded } from '$lib/utils/map';

	let file: File | null = null;
	let error: string | null = null;

	async function handleFileChange(event: Event) {
		error = null;
		try {
			const input = event.target as HTMLInputElement;
			if (!input.files || input.files.length === 0) return;
			file = input.files[0];
			const text = await file.text();
			if (!browser) return;
			const dom = new DOMParser().parseFromString(text, 'application/xml');
			const fc = gpx(dom) as FeatureCollection;
			const trackFeature = fc.features.find(
				(f): f is Feature<LineString> => f.geometry?.type === 'LineString'
			);
			if (!trackFeature) {
				throw new Error('no track');
			}
			const coords = trackFeature.geometry.coordinates.map((p) => [p[0], p[1]] as [number, number]);
			if (coords.length === 0) {
				throw new Error('no coords');
			}
			const geometry: LineString = {
				type: 'LineString',
				coordinates: coords,
			};
			const geojson: Feature<LineString> = {
				type: 'Feature',
				geometry,
				properties: {},
			};
			pathStore.set(geometry);

			const map = get(mapStore);
			if (!map) return;

			onMapLoaded(map, () => {
				const sourceId = 'gpx-track';
				const layerId = 'gpx-track-line';
				const existing = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
				if (existing) {
					existing.setData(geojson);
				} else {
					map.addSource(sourceId, { type: 'geojson', data: geojson });
				}
				if (!map.getLayer(layerId)) {
					map.addLayer({
						id: layerId,
						type: 'line',
						source: sourceId,
						paint: {
							'line-color': '#ff0000',
							'line-width': 4,
						},
					});
				}

				const bounds = coords.reduce(
					(b, coord) => b.extend(coord as [number, number]),
					new maplibregl.LngLatBounds(coords[0], coords[0])
				);
				map.fitBounds(bounds, { padding: 20 });
			});
		} catch (err) {
			console.error('failed to process GPX', err);
			error = 'GPX-Datei konnte nicht geladen werden';
		}
	}
</script>

<div class="space-y-2">
	<input type="file" accept=".gpx" on:change={handleFileChange} />
	{#if file}
		<p class="text-sm">Geladene Datei: {file.name}</p>
	{/if}
	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
</div>
