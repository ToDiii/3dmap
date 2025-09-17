<script lang="ts">
	import type { Feature, FeatureCollection, LineString } from 'geojson';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { mapStore } from '$lib/stores/map';
	import { extrudeGroupStore } from '$lib/stores/extrudeGroupStore';
	import { modelGeo } from '$lib/stores/modelGeoStore';
	import { modelError } from '$lib/stores/modelStore';
        import { pathStore } from '$lib/stores/pathStore';
        import { pathStyleStore } from '$lib/stores/pathStyleStore';
        import * as THREE from 'three';
        import { getBuildingMaterial, disposeBuildingMaterials } from '$lib/three/materials';
        import { colorPalette } from '$lib/stores/colorPalette';
        import type { ColorPalette } from '$lib/stores/colorPalette';

	export let map: maplibregl.Map | undefined;

	const DEFAULT_STYLE = 'https://demotiles.maplibre.org/style.json';
	export let styleUrl: string = import.meta.env.VITE_MAP_STYLE_URL ?? DEFAULT_STYLE;

	export let center: [number, number] = [11.576124, 48.137154];
	export let zoom: number = 5;

	let mapContainer: HTMLDivElement;
	let extrudeGroup: THREE.Group = new THREE.Group();
	extrudeGroupStore.set(extrudeGroup);
	const routeSourceId = 'route-preview';
	const routeLayerId = 'route-preview-line';
	let unsubRoute: (() => void) | null = null;
	let unsubGeo: (() => void) | null = null;
	let unsubErr: (() => void) | null = null;
	let toastMessage: string | null = null;
        let unsubPalette: (() => void) | null = null;
        let unsubPathStyle: (() => void) | null = null;

        const emptyFC: FeatureCollection = { type: 'FeatureCollection', features: [] };

        let palette: ColorPalette = get(colorPalette);
        let pathStyle = get(pathStyleStore);

        function buildingColorExpression(p: ColorPalette) {
                return [
                        'match',
                        ['get', 'subtype'],
                        'building_commercial',
                        p.buildingCommercial ?? p.building,
                        'building_industrial',
                        p.buildingIndustrial ?? p.building,
                        'building_residential',
                        p.buildingResidential ?? p.building,
                        p.building,
                ];
        }

        function updateLayerColors() {
                if (!map) return;
                const setPaint = (layer: string, prop: string, value: any) => {
                        if (map?.getLayer(layer)) {
                                map.setPaintProperty(layer, prop, value);
                        }
                };
                setPaint('extrude-buildings', 'fill-extrusion-color', buildingColorExpression(palette));
                setPaint('model-water', 'fill-color', palette.water);
                setPaint('model-green', 'fill-color', palette.greenery);
                setPaint('model-sand', 'fill-color', palette.sand);
                setPaint('model-roads', 'fill-extrusion-color', palette.road);
                setPaint('model-piers', 'fill-extrusion-color', palette.pier);
        }

        function updateRouteStyle() {
                if (!map) return;
                if (map.getLayer(routeLayerId)) {
                        map.setPaintProperty(routeLayerId, 'line-color', pathStyle.color);
                }
        }

        unsubPalette = colorPalette.subscribe((p) => {
                palette = p;
                updateLayerColors();
        });

        unsubPathStyle = pathStyleStore.subscribe((style) => {
                pathStyle = style;
                updateRouteStyle();
        });

        onDestroy(() => {
                if (unsubPalette) {
                        unsubPalette();
                        unsubPalette = null;
                }
                if (unsubPathStyle) {
                        unsubPathStyle();
                        unsubPathStyle = null;
                }
        });

	function clearGroup(group: THREE.Group, disposeMaterials = false) {
		group.traverse((obj) => {
			if (obj instanceof THREE.Mesh) {
				obj.geometry.dispose();
				if (disposeMaterials) {
					if (Array.isArray(obj.material)) {
						obj.material.forEach((m) => m.dispose());
					} else {
						(obj.material as THREE.Material).dispose();
					}
				}
			}
		});
		group.clear();
	}

	function renderExtrudedBuildings(features: Feature[] = []) {
		clearGroup(extrudeGroup);
		if (!features || features.length === 0) {
			map?.triggerRepaint();
			return;
		}
		for (const f of features) {
			if (f.geometry.type !== 'Polygon') continue;
			const pts = f.geometry.coordinates[0];
			if (!pts || pts.length < 3) continue;
			const shape = new THREE.Shape();
			pts.forEach(([lng, lat], idx) => {
				const mc = maplibregl.MercatorCoordinate.fromLngLat({ lng, lat });
				if (idx === 0) shape.moveTo(mc.x, mc.y);
				else shape.lineTo(mc.x, mc.y);
			});
			const base = (f.properties?.base_height as number) ?? 0;
			const extrudeHeight = ((f.properties?.height_final as number) ?? base) - base;
			const geom = new THREE.ExtrudeGeometry(shape, {
				depth: extrudeHeight,
				bevelEnabled: false,
			});
			const subtype = f.properties?.subtype || 'building_residential';
			const mat = getBuildingMaterial(subtype);
			const mesh = new THREE.Mesh(geom, mat);
			mesh.position.z = base;
			extrudeGroup.add(mesh);
		}
		map?.triggerRepaint();
	}

	function ensureLayers() {
		if (!map) return;
		if (!map.getSource('model-geo')) {
			map.addSource('model-geo', { type: 'geojson', data: emptyFC });
		}
                if (!map.getLayer('extrude-buildings')) {
                        map.addLayer({
                                id: 'extrude-buildings',
                                type: 'fill-extrusion',
                                source: 'model-geo',
                                filter: ['==', ['get', 'featureType'], 'building'],
                                paint: {
                                        'fill-extrusion-color': buildingColorExpression(palette),
                                        'fill-extrusion-opacity': 0.9,
                                        'fill-extrusion-height': ['get', 'height_final'],
                                        'fill-extrusion-base': ['get', 'base_height'],
                                },
                        });
		}
		if (!map.getLayer('model-water')) {
			map.addLayer({
				id: 'model-water',
				type: 'fill',
				source: 'model-geo',
				filter: ['==', ['get', 'featureType'], 'water'],
				paint: { 'fill-color': palette.water, 'fill-opacity': 0.5 },
			});
		}
		if (!map.getLayer('model-green')) {
			map.addLayer({
				id: 'model-green',
				type: 'fill',
				source: 'model-geo',
				filter: ['==', ['get', 'featureType'], 'green'],
				paint: { 'fill-color': palette.greenery, 'fill-opacity': 0.5 },
			});
		}
		if (!map.getLayer('model-sand')) {
			map.addLayer({
				id: 'model-sand',
				type: 'fill',
				source: 'model-geo',
				filter: ['==', ['get', 'featureType'], 'sand'],
				paint: { 'fill-color': palette.sand, 'fill-opacity': 0.5 },
			});
		}
		if (!map.getLayer('model-roads')) {
			map.addLayer({
				id: 'model-roads',
				type: 'fill-extrusion',
				source: 'model-geo',
				filter: ['==', ['get', 'featureType'], 'road'],
				paint: {
					'fill-extrusion-color': palette.road,
					'fill-extrusion-height': ['get', 'height_final'],
					'fill-extrusion-base': ['get', 'base_height'],
					'fill-extrusion-opacity': 0.9,
				},
			});
		}
		if (!map.getLayer('model-piers')) {
			map.addLayer({
				id: 'model-piers',
				type: 'fill-extrusion',
				source: 'model-geo',
				filter: ['==', ['get', 'featureType'], 'pier'],
				paint: {
					'fill-extrusion-color': palette.pier,
					'fill-extrusion-height': ['get', 'height_final'],
					'fill-extrusion-base': ['get', 'base_height'],
					'fill-extrusion-opacity': 0.9,
				},
			});
		}
	}

	onMount(() => {
		map = new maplibregl.Map({
			container: mapContainer,
			style: styleUrl,
			center,
			zoom,
		});

		map.on('style.load', () => {
			mapStore.set(map!);
			map!.addControl(new maplibregl.NavigationControl(), 'top-right');
			map!.addControl(new maplibregl.ScaleControl());
			ensureLayers();
			(window as any).__map = map;

			unsubGeo = modelGeo.subscribe((geo) => {
				const src = map!.getSource('model-geo') as maplibregl.GeoJSONSource;
				src.setData(geo || emptyFC);
				ensureLayers();
				const buildingFeatures =
					geo?.features.filter((f) => f.properties?.featureType === 'building') || [];
				renderExtrudedBuildings(buildingFeatures);
				if (geo && geo.features.length === 0) {
					toastMessage = 'Keine OSM-Gebäude im gewählten Bereich.';
					setTimeout(() => (toastMessage = null), 2000);
				}
			});

			unsubErr = modelError.subscribe((err) => {
				if (err) {
					toastMessage = err;
					setTimeout(() => (toastMessage = null), 2000);
				}
			});

			unsubRoute = pathStore.subscribe((line) => {
				if (!map) return;
				if (line) {
					const geojson: Feature<LineString> = {
						type: 'Feature',
						geometry: line,
						properties: {},
					};
					const src = map.getSource(routeSourceId) as maplibregl.GeoJSONSource | undefined;
					if (src) src.setData(geojson);
					else map.addSource(routeSourceId, { type: 'geojson', data: geojson });
                                        if (!map.getLayer(routeLayerId)) {
                                                map.addLayer({
                                                        id: routeLayerId,
                                                        type: 'line',
                                                        source: routeSourceId,
                                                        paint: { 'line-color': pathStyle.color, 'line-width': 4 },
                                                });
                                        }
                                } else {
                                        if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId);
                                        if (map.getSource(routeSourceId)) map.removeSource(routeSourceId);
				}
			});
			const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
			map!.on('mousemove', (e) => {
				const feats = map!.queryRenderedFeatures(e.point, {
					layers: [
						'extrude-buildings',
						'model-water',
						'model-green',
						'model-sand',
						'model-roads',
						'model-piers',
					],
				});
				if (feats.length === 0) {
					popup.remove();
					return;
				}
				const f = feats[0];
				const p: any = f.properties || {};
				let html = '';
				if (p.name) html += `<strong>${p.name}</strong><br/>`;
				if (p.subtype) html += `${p.subtype}<br/>`;
				if (p.height_final) html += `Höhe: ${Number(p.height_final).toFixed(1)} m<br/>`;
				if (p.levels) html += `Stockwerke: ${p.levels}<br/>`;
				else if (p.height) html += `Höhe Tag: ${p.height}<br/>`;
				popup.setLngLat(e.lngLat).setHTML(html).addTo(map!);
			});
		});

                return () => {
                        if (unsubGeo) unsubGeo();
                        if (unsubErr) unsubErr();
                        if (unsubRoute) unsubRoute();
                        if (unsubPalette) {
                                unsubPalette();
                                unsubPalette = null;
                        }
                        if (unsubPathStyle) {
                                unsubPathStyle();
                                unsubPathStyle = null;
                        }
                        mapStore.set(undefined);
                        extrudeGroupStore.set(null);
                        map?.remove();
                        disposeBuildingMaterials();
                };
	});
</script>

<div bind:this={mapContainer} class="relative h-full w-full">
	{#if toastMessage}
		<div
			class="absolute left-1/2 top-2 -translate-x-1/2 rounded bg-red-600 px-2 py-1 text-sm text-white"
		>
			{toastMessage}
		</div>
	{/if}
</div>
