import type { Polygon, Feature, FeatureCollection } from 'geojson';
import { mapBuildingSubtype } from '$lib/constants/palette';
import intersect from '@turf/intersect';
import area from '@turf/area';
import buffer from '@turf/buffer';
import { lineString } from '@turf/helpers';
import { getRoadWidthMeters, getWaterwayWidthMeters } from '$lib/model/widths';

interface BuildOverpassQueryOptions {
	footpathRoadsEnabled?: boolean;
	piersEnabled?: boolean;
	beachEnabled?: boolean;
	oceanEnabled?: boolean;
}

interface ConvertOptions {
	minBuildingAreaM2?: number;
	clipPolygon?: Polygon;
	minBuildingHeightMM?: number;
	waterHeightMM?: number;
	greeneryHeightMM?: number;
	beachHeightMM?: number;
	pierHeightMM?: number;
	minWaterAreaM2?: number;
	beachEnabled?: boolean;
	piersEnabled?: boolean;
	oceanEnabled?: boolean;
}

export function buildOverpassQuery(
	elements: string[],
	bbox?: [number, number, number, number],
	shape?: Polygon,
	options: BuildOverpassQueryOptions = {}
): string {
	const {
		footpathRoadsEnabled = true,
		piersEnabled = false,
		beachEnabled = false,
		oceanEnabled = true,
	} = options;
	// area restriction: prefer shape polygon, fallback to bbox
	const areaPart = shape
		? `(poly:"${shape.coordinates[0].map(([lng, lat]) => `${lat} ${lng}`).join(' ')}")`
		: bbox
			? `(${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]})`
			: '';
	let query = '[out:json][timeout:25];(';
	if (elements.includes('buildings')) {
		query += `way["building"]${areaPart};relation["building"]${areaPart};`;
	}
	if (elements.includes('roads')) {
		if (footpathRoadsEnabled) {
			query += `way["highway"]${areaPart};`;
		} else {
			query += `way["highway"]["highway"!~"^(footway|path|pedestrian|cycleway|steps)$"]${areaPart};`;
		}
	}
	if (elements.includes('water')) {
		const oceanFilter = oceanEnabled ? '' : '["water"!~"^(sea|ocean)$"]';
		query += `way["natural"="water"]${oceanFilter}${areaPart};relation["natural"="water"]${oceanFilter}${areaPart};way["waterway"]${areaPart};`;
		if (piersEnabled) {
			query += `way["man_made"="pier"]${areaPart};relation["man_made"="pier"]${areaPart};`;
		}
		if (beachEnabled) {
			query += `way["natural"~"^(sand|beach)$"]${areaPart};relation["natural"~"^(sand|beach)$"]${areaPart};`;
		}
	}
	if (elements.includes('green')) {
		query += `way["leisure"="park"]${areaPart};relation["leisure"="park"]${areaPart};way["landuse"="grass"]${areaPart};relation["landuse"="grass"]${areaPart};`;
	}
	query += ');out geom;';
	return query;
}

export function convertTo3D(
	data: any,
	scale: number,
	baseHeight: number,
	buildingMultiplier: number,
	options: ConvertOptions = {}
) {
	const {
		minBuildingAreaM2 = 0,
		clipPolygon,
		minBuildingHeightMM = 0,
		waterHeightMM = 100,
		greeneryHeightMM = 100,
		beachHeightMM = 100,
		pierHeightMM = 100,
		minWaterAreaM2 = 0,
		beachEnabled = false,
		piersEnabled = false,
		oceanEnabled = true,
	} = options;
	const waterHeight = baseHeight + waterHeightMM / 1000;
	const greenHeight = baseHeight + greeneryHeightMM / 1000;
	const beachHeight = baseHeight + beachHeightMM / 1000;
	const pierHeight = baseHeight + pierHeightMM / 1000;
	const features: any[] = [];
	const geoFeatures: Feature[] = [];
	for (const element of data.elements || []) {
		if (!element.geometry) continue;
		const tags = element.tags || {};
		const name = tags.name;
		if (tags.building) {
			const poly = element.geometry.map((p: any) => [p.lon, p.lat]);
			if (
				poly.length > 0 &&
				(poly[0][0] !== poly[poly.length - 1][0] || poly[0][1] !== poly[poly.length - 1][1])
			) {
				poly.push(poly[0]);
			}
			let polys = [poly];
			if (clipPolygon) {
				let clipped: any;
				try {
					clipped = intersect(
						{
							type: 'Feature',
							geometry: { type: 'Polygon', coordinates: [poly] },
							properties: {},
						} as any,
						{ type: 'Feature', geometry: clipPolygon, properties: {} } as any
					);
				} catch {
					clipped = null;
				}
				if (!clipped) continue;
				polys =
					clipped.geometry.type === 'Polygon'
						? [clipped.geometry.coordinates[0]]
						: (clipped.geometry.coordinates as any[]).map((c) => c[0]);
			}
			const subtype = mapBuildingSubtype(tags);
			for (const polyCoords of polys) {
				const a = area({ type: 'Polygon', coordinates: [polyCoords] } as any);
				if (minBuildingAreaM2 > 0 && a < minBuildingAreaM2) continue;
				const coords = polyCoords.map(([lon, lat]: any) => [lon * scale, baseHeight, lat * scale]);
				let heightRaw = 0;
				if (tags.height) {
					const m = /([0-9.]+)/.exec(tags.height);
					if (m) heightRaw = parseFloat(m[1]);
				} else if (tags['building:levels']) {
					heightRaw = parseFloat(tags['building:levels']) * 3;
				} else {
					heightRaw = 10;
				}
				const heightMm = Math.max(minBuildingHeightMM, heightRaw * 1000 * buildingMultiplier);
				const height = baseHeight + heightMm / 1000;
				features.push({ id: element.id, type: 'building', geometry: coords, height, subtype });
				const props: any = {
					height_raw: heightRaw,
					base_height: baseHeight,
					height_final: height,
					featureType: 'building',
					name,
					area_m2: a,
				};
				if (subtype) props.subtype = subtype;
				if (tags['building:levels']) props.levels = tags['building:levels'];
				if (tags.height) props.height = tags.height;
				geoFeatures.push({
					type: 'Feature',
					geometry: { type: 'Polygon', coordinates: [polyCoords] },
					properties: props,
				});
			}
			continue;
		}
		if (tags.highway) {
			const width = getRoadWidthMeters(tags);
			const line = lineString(element.geometry.map((p: any) => [p.lon, p.lat]));
			const buf = buffer(line, width / 2, { units: 'meters', steps: 16 }).geometry;
			const polys =
				buf.type === 'Polygon' ? [buf.coordinates[0]] : buf.coordinates.map((c) => c[0]);
			for (const poly of polys) {
				const a = area({ type: 'Polygon', coordinates: [poly] } as any);
				if (minBuildingAreaM2 > 0 && a < minBuildingAreaM2) continue;
				const coords = poly.map(([lon, lat]: any) => [lon * scale, baseHeight, lat * scale]);
				const height = baseHeight + 0.2;
				features.push({ id: element.id, type: 'road', geometry: coords, height });
				geoFeatures.push({
					type: 'Feature',
					geometry: { type: 'Polygon', coordinates: [poly] },
					properties: {
						featureType: 'road',
						kind: 'road',
						width_m: width,
						area_m2: a,
						base_height: baseHeight,
						height_final: height,
						name,
					},
				});
			}
			continue;
		}
		if (tags.waterway) {
			const width = getWaterwayWidthMeters(tags);
			const line = lineString(element.geometry.map((p: any) => [p.lon, p.lat]));
			const buf = buffer(line, width / 2, { units: 'meters', steps: 16 }).geometry;
			const polys =
				buf.type === 'Polygon' ? [buf.coordinates[0]] : buf.coordinates.map((c) => c[0]);
			for (const poly of polys) {
				const a = area({ type: 'Polygon', coordinates: [poly] } as any);
				if (minWaterAreaM2 > 0 && a < minWaterAreaM2) continue;
				const coords = poly.map(([lon, lat]: any) => [lon * scale, baseHeight, lat * scale]);
				const height = waterHeight;
				features.push({ id: element.id, type: 'water', geometry: coords, height });
				geoFeatures.push({
					type: 'Feature',
					geometry: { type: 'Polygon', coordinates: [poly] },
					properties: {
						featureType: 'water',
						kind: 'water',
						width_m: width,
						area_m2: a,
						base_height: baseHeight,
						height_final: height,
						name,
					},
				});
			}
			continue;
		}
		if (tags.natural === 'water') {
			if (!oceanEnabled && (tags.water === 'sea' || tags.water === 'ocean')) continue;
			const poly = element.geometry.map((p: any) => [p.lon, p.lat]);
			if (
				poly.length > 0 &&
				(poly[0][0] !== poly[poly.length - 1][0] || poly[0][1] !== poly[poly.length - 1][1])
			) {
				poly.push(poly[0]);
			}
			const a = area({ type: 'Polygon', coordinates: [poly] } as any);
			if (minWaterAreaM2 > 0 && a < minWaterAreaM2) continue;
			features.push({
				id: element.id,
				type: 'water',
				geometry: poly.map(([lon, lat]: any) => [lon * scale, baseHeight, lat * scale]),
				height: waterHeight,
			});
			geoFeatures.push({
				type: 'Feature',
				geometry: { type: 'Polygon', coordinates: [poly] },
				properties: {
					featureType: 'water',
					kind: 'water',
					area_m2: a,
					base_height: baseHeight,
					height_final: waterHeight,
					name,
				},
			});
			continue;
		}
		if (
			beachEnabled &&
			(tags.natural === 'sand' || tags.natural === 'beach' || tags.landuse === 'beach')
		) {
			const poly = element.geometry.map((p: any) => [p.lon, p.lat]);
			if (
				poly.length > 0 &&
				(poly[0][0] !== poly[poly.length - 1][0] || poly[0][1] !== poly[poly.length - 1][1])
			) {
				poly.push(poly[0]);
			}
			const a = area({ type: 'Polygon', coordinates: [poly] } as any);
			features.push({
				id: element.id,
				type: 'sand',
				geometry: poly.map(([lon, lat]: any) => [lon * scale, baseHeight, lat * scale]),
				height: beachHeight,
			});
			geoFeatures.push({
				type: 'Feature',
				geometry: { type: 'Polygon', coordinates: [poly] },
				properties: {
					featureType: 'sand',
					kind: 'beach',
					area_m2: a,
					base_height: baseHeight,
					height_final: beachHeight,
					name,
				},
			});
			continue;
		}
		if (piersEnabled && tags.man_made === 'pier') {
			const poly = element.geometry.map((p: any) => [p.lon, p.lat]);
			if (
				poly.length > 0 &&
				(poly[0][0] !== poly[poly.length - 1][0] || poly[0][1] !== poly[poly.length - 1][1])
			) {
				poly.push(poly[0]);
			}
			if (poly.length < 4) continue;
			const a = area({ type: 'Polygon', coordinates: [poly] } as any);
			features.push({
				id: element.id,
				type: 'pier',
				geometry: poly.map(([lon, lat]: any) => [lon * scale, baseHeight, lat * scale]),
				height: pierHeight,
			});
			geoFeatures.push({
				type: 'Feature',
				geometry: { type: 'Polygon', coordinates: [poly] },
				properties: {
					featureType: 'pier',
					area_m2: a,
					base_height: baseHeight,
					height_final: pierHeight,
					name,
				},
			});
			continue;
		}
		if (tags.leisure === 'park' || tags.landuse === 'grass') {
			const poly = element.geometry.map((p: any) => [p.lon, p.lat]);
			if (
				poly.length > 0 &&
				(poly[0][0] !== poly[poly.length - 1][0] || poly[0][1] !== poly[poly.length - 1][1])
			) {
				poly.push(poly[0]);
			}
			const a = area({ type: 'Polygon', coordinates: [poly] } as any);
			if (minBuildingAreaM2 > 0 && a < minBuildingAreaM2) continue;
			features.push({
				id: element.id,
				type: 'green',
				geometry: poly.map(([lon, lat]: any) => [lon * scale, baseHeight, lat * scale]),
				height: greenHeight,
			});
			geoFeatures.push({
				type: 'Feature',
				geometry: { type: 'Polygon', coordinates: [poly] },
				properties: {
					featureType: 'green',
					area_m2: a,
					base_height: baseHeight,
					height_final: greenHeight,
					name,
				},
			});
			continue;
		}
	}
	const geojson: FeatureCollection = { type: 'FeatureCollection', features: geoFeatures };
	return { features, geojson };
}

export type ModelResult = ReturnType<typeof convertTo3D>;
