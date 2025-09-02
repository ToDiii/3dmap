<script lang="ts">
	import type { Feature, Polygon } from 'geojson';
	import { onMount } from 'svelte';
	import { mapStore } from '$lib/stores/map';
	import { bboxStore } from '$lib/stores/bboxStore';
	import maplibregl, { type Map as MaplibreMap, type MapMouseEvent } from 'maplibre-gl';
	import { onMapLoaded } from '$lib/utils/map';

	let map: MaplibreMap | undefined;
	let isDrawing = false;
	let start: [number, number] | null = null;
	let drawingMode: 'rect' | 'circle' | null = null;

	function boundsToPolygon(bounds: maplibregl.LngLatBounds): Polygon {
		const sw = bounds.getSouthWest();
		const ne = bounds.getNorthEast();
		const nw = { lng: sw.lng, lat: ne.lat };
		const se = { lng: ne.lng, lat: sw.lat };
		return {
			type: 'Polygon',
			coordinates: [
				[
					[sw.lng, sw.lat],
					[nw.lng, nw.lat],
					[ne.lng, ne.lat],
					[se.lng, se.lat],
					[sw.lng, sw.lat],
				],
			],
		};
	}

	function updateSource(poly: Polygon) {
		if (!map) return;
		const m = map;
		const run = () => {
			const data: Feature<Polygon> = {
				type: 'Feature',
				geometry: poly,
				properties: {},
			};
			const source = m.getSource('bbox') as maplibregl.GeoJSONSource | undefined;
			if (source) {
				source.setData(data);
			} else {
				m.addSource('bbox', { type: 'geojson', data });
				m.addLayer({
					id: 'bbox-fill',
					type: 'fill',
					source: 'bbox',
					paint: { 'fill-color': '#088', 'fill-opacity': 0.1 },
				});
				m.addLayer({
					id: 'bbox-line',
					type: 'line',
					source: 'bbox',
					paint: { 'line-color': '#088', 'line-width': 2 },
				});
			}
		};
		onMapLoaded(m, run);
	}

	function clearBox() {
		if (!map) return;
		if (map.getLayer('bbox-fill')) map.removeLayer('bbox-fill');
		if (map.getLayer('bbox-line')) map.removeLayer('bbox-line');
		if (map.getSource('bbox')) map.removeSource('bbox');
		bboxStore.set(null);
	}

	function circleToPolygon(center: [number, number], radius: number, steps = 64): Polygon {
		const coords: [number, number][] = [];
		for (let i = 0; i <= steps; i++) {
			const ang = (i / steps) * Math.PI * 2;
			coords.push([center[0] + radius * Math.cos(ang), center[1] + radius * Math.sin(ang)]);
		}
		return { type: 'Polygon', coordinates: [coords] };
	}

	function startDrawing(mode: 'rect' | 'circle') {
		if (!map) return;
		drawingMode = mode;
		isDrawing = true;
		map.getCanvas().style.cursor = 'crosshair';

		const onMouseDown = (e: MapMouseEvent) => {
			start = [e.lngLat.lng, e.lngLat.lat];
			map!.dragPan.disable();

			const onMove = (ev: MapMouseEvent) => {
				if (drawingMode === 'rect') {
					const bounds = new maplibregl.LngLatBounds(start!, [ev.lngLat.lng, ev.lngLat.lat]);
					updateSource(boundsToPolygon(bounds));
				} else {
					const r = Math.max(
						Math.abs(ev.lngLat.lng - start![0]),
						Math.abs(ev.lngLat.lat - start![1])
					);
					updateSource(circleToPolygon(start!, r));
				}
			};

			const onUp = (ev: MapMouseEvent) => {
				if (drawingMode === 'rect') {
					const bounds = new maplibregl.LngLatBounds(start!, [ev.lngLat.lng, ev.lngLat.lat]);
					updateSource(boundsToPolygon(bounds));
					bboxStore.set([bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()]);
				} else {
					const r = Math.max(
						Math.abs(ev.lngLat.lng - start![0]),
						Math.abs(ev.lngLat.lat - start![1])
					);
					updateSource(circleToPolygon(start!, r));
					bboxStore.set([start![1] - r, start![0] - r, start![1] + r, start![0] + r]);
				}
				map!.getCanvas().style.cursor = '';
				map!.off('mousemove', onMove);
				map!.off('mouseup', onUp);
				map!.dragPan.enable();
				isDrawing = false;
				drawingMode = null;
			};

			map!.on('mousemove', onMove);
			map!.on('mouseup', onUp);
		};

		map.once('mousedown', onMouseDown);
	}

	const startRectangle = () => startDrawing('rect');
	const startCircle = () => startDrawing('circle');

	onMount(() => {
		const unsubscribe = mapStore.subscribe((m) => {
			map = m;
		});
		return () => unsubscribe();
	});
</script>

<div class="space-y-2">
	<button
		class="rounded bg-blue-500 px-2 py-1 text-white"
		on:click={startRectangle}
		disabled={isDrawing}
	>
		Rechteck zeichnen
	</button>
	<button
		class="rounded bg-green-500 px-2 py-1 text-white"
		on:click={startCircle}
		disabled={isDrawing}
	>
		Kreis zeichnen
	</button>
	<button class="rounded bg-gray-300 px-2 py-1" on:click={clearBox}> Löschen </button>
</div>
