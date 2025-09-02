import type * as GeoJSON from 'geojson';
import { ROUTING_API_KEY, ROUTING_MAX_WAYPOINTS, ROUTING_PROVIDER } from '$lib/config/env';

export interface RouteResult {
	geometry: GeoJSON.LineString;
	distanceKm?: number;
	durationMin?: number;
}

export async function routeWaypoints(
	coords: Array<[number, number]>,
	provider: string = ROUTING_PROVIDER
): Promise<RouteResult> {
	if (coords.length > ROUTING_MAX_WAYPOINTS) {
		throw { status: 400, message: `max waypoints ${ROUTING_MAX_WAYPOINTS} exceeded` };
	}
	switch (provider) {
		case 'openrouteservice': {
			const res = await fetch(
				'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: ROUTING_API_KEY || '',
					},
					body: JSON.stringify({ coordinates: coords }),
				}
			);
			if (!res.ok) throw { status: res.status };
			const data: any = await res.json();
			const feat = data.features[0];
			return {
				geometry: feat.geometry,
				distanceKm: feat.properties?.summary?.distance / 1000,
				durationMin: feat.properties?.summary?.duration / 60,
			};
		}
		case 'osrm': {
			const coordStr = coords.map((c) => c.join(',')).join(';');
			const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
			const res = await fetch(url);
			if (!res.ok) throw { status: res.status };
			const data: any = await res.json();
			const route = data.routes[0];
			return {
				geometry: route.geometry,
				distanceKm: route.distance / 1000,
				durationMin: route.duration / 60,
			};
		}
		case 'graphhopper': {
			const params = new URLSearchParams({
				profile: 'car',
				points_encoded: 'false',
				instructions: 'false',
			});
			if (ROUTING_API_KEY) params.set('key', ROUTING_API_KEY);
			coords.forEach((c) => params.append('point', `${c[1]},${c[0]}`));
			const res = await fetch(`https://graphhopper.com/api/1/route?${params.toString()}`);
			if (!res.ok) throw { status: res.status };
			const data: any = await res.json();
			const path = data.paths[0];
			const geometry: GeoJSON.LineString = {
				type: 'LineString',
				coordinates: path.points.coordinates,
			};
			return {
				geometry,
				distanceKm: path.distance / 1000,
				durationMin: path.time / 60000,
			};
		}
		default:
			throw { status: 400, message: 'Unsupported routing provider' };
	}
}
