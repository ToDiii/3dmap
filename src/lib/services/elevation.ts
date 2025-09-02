import type * as GeoJSON from 'geojson';
import { ELEVATION_PROVIDER, ELEVATION_API_KEY, ELEVATION_BATCH_SIZE } from '$lib/config/env';

function sleep(ms: number) {
	return new Promise((res) => setTimeout(res, ms));
}

async function fetchOpentopodata(batch: Array<[number, number]>): Promise<number[]> {
	const locations = batch.map(([lon, lat]) => `${lat},${lon}`).join('|');
	const url = `https://api.opentopodata.org/v1/test-dataset?locations=${locations}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error('opentopodata request failed');
	const data = await res.json();
	return (data.results || []).map((r: any) => Number(r.elevation ?? 0));
}

async function fetchOpenElevation(batch: Array<[number, number]>): Promise<number[]> {
	const body = JSON.stringify({
		locations: batch.map(([lon, lat]) => ({ latitude: lat, longitude: lon })),
	});
	const res = await fetch('https://api.open-elevation.com/api/v1/lookup', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body,
	});
	if (!res.ok) throw new Error('open-elevation request failed');
	const data = await res.json();
	return (data.results || []).map((r: any) => Number(r.elevation ?? 0));
}

async function fetchMapboxTerrain(batch: Array<[number, number]>): Promise<number[]> {
	if (!ELEVATION_API_KEY) throw new Error('Missing Mapbox API key');
	const elevations: number[] = [];
	for (const [lon, lat] of batch) {
		const url = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lon},${lat}.json?layers=contour&limit=50&access_token=${ELEVATION_API_KEY}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error('mapbox-terrain request failed');
		const data = await res.json();
		const ele = data?.features?.[0]?.properties?.ele;
		elevations.push(Number(ele ?? 0));
	}
	return elevations;
}

async function fetchBatch(batch: Array<[number, number]>): Promise<number[]> {
	switch (ELEVATION_PROVIDER) {
		case 'opentopodata':
			return fetchOpentopodata(batch);
		case 'open-elevation':
			return fetchOpenElevation(batch);
		case 'mapbox-terrain':
			return fetchMapboxTerrain(batch);
		default:
			throw new Error('Unsupported elevation provider');
	}
}

export async function sampleElevation(coords: Array<[number, number]>): Promise<number[]> {
	const elevations: number[] = [];
	for (let i = 0; i < coords.length; i += ELEVATION_BATCH_SIZE) {
		const batch = coords.slice(i, i + ELEVATION_BATCH_SIZE);
		let attempt = 0;
		while (true) {
			try {
				const res = await fetchBatch(batch);
				elevations.push(...res);
				break;
			} catch (err) {
				attempt++;
				if (attempt >= 3) throw err;
				await sleep(attempt * 200);
			}
		}
	}
	return elevations;
}

function haversine(a: [number, number], b: [number, number]): number {
	const R = 6371000;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(b[1] - a[1]);
	const dLon = toRad(b[0] - a[0]);
	const lat1 = toRad(a[1]);
	const lat2 = toRad(b[1]);
	const h =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function densifyLine(
	line: GeoJSON.LineString,
	targetSamples: number
): Array<[number, number]> {
	const coords = line.coordinates as [number, number][];
	if (coords.length >= targetSamples) return coords.slice();
	const distances: number[] = [0];
	for (let i = 1; i < coords.length; i++) {
		distances[i] = distances[i - 1] + haversine(coords[i - 1], coords[i]);
	}
	const total = distances[distances.length - 1];
	const step = total / (targetSamples - 1);
	const result: Array<[number, number]> = [];
	let seg = 0;
	for (let i = 0; i < targetSamples; i++) {
		const dist = i * step;
		while (seg < distances.length - 1 && dist > distances[seg + 1]) seg++;
		const segStart = coords[seg];
		const segEnd = coords[seg + 1];
		const segDist = distances[seg + 1] - distances[seg];
		const t = segDist === 0 ? 0 : (dist - distances[seg]) / segDist;
		result.push([
			segStart[0] + (segEnd[0] - segStart[0]) * t,
			segStart[1] + (segEnd[1] - segStart[1]) * t,
		]);
	}
	return result;
}

export function statsFromElevations(elev: number[]): {
	min: number;
	max: number;
	gain: number;
	loss: number;
} {
	if (elev.length === 0) return { min: 0, max: 0, gain: 0, loss: 0 };
	let min = elev[0];
	let max = elev[0];
	let gain = 0;
	let loss = 0;
	for (let i = 1; i < elev.length; i++) {
		const d = elev[i] - elev[i - 1];
		if (d > 0) gain += d;
		else loss -= d;
		if (elev[i] < min) min = elev[i];
		if (elev[i] > max) max = elev[i];
	}
	return { min, max, gain, loss };
}
