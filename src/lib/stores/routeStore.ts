import { writable } from 'svelte/store';
import { pathStore } from './pathStore';

export interface Waypoint {
	id: string;
	address: string;
	coord?: [number, number];
}

interface RouteState {
	waypoints: Waypoint[];
	route: GeoJSON.LineString | null;
	distanceKm?: number;
	durationMin?: number;
	elevations?: number[];
	elevationStats?: { min: number; max: number; gain: number; loss: number };
}

function createRouteStore() {
	const { subscribe, update, set } = writable<RouteState>({ waypoints: [], route: null });

	return {
		subscribe,
		addWaypoint: () =>
			update((s) => ({
				...s,
				waypoints: [...s.waypoints, { id: Math.random().toString(36).slice(2), address: '' }],
			})),
		removeWaypoint: (id: string) =>
			update((s) => ({ ...s, waypoints: s.waypoints.filter((w) => w.id !== id) })),
		reorder: (oldIdx: number, newIdx: number) =>
			update((s) => {
				const wp = s.waypoints.splice(oldIdx, 1)[0];
				s.waypoints.splice(newIdx, 0, wp);
				return { ...s };
			}),
		setCoord: (id: string, coord: [number, number]) =>
			update((s) => {
				const wp = s.waypoints.find((w) => w.id === id);
				if (wp) wp.coord = coord;
				return { ...s };
			}),
		setAddress: (id: string, address: string) =>
			update((s) => {
				const wp = s.waypoints.find((w) => w.id === id);
				if (wp) wp.address = address;
				return { ...s };
			}),
		setRoute: (route: GeoJSON.LineString | null, distanceKm?: number, durationMin?: number) =>
			update((s) => {
				pathStore.set(route);
				return { ...s, route, distanceKm, durationMin };
			}),
		resetRoute: () =>
			update((s) => {
				pathStore.set(null);
				return {
					...s,
					route: null,
					distanceKm: undefined,
					durationMin: undefined,
					elevations: undefined,
					elevationStats: undefined,
				};
			}),
		async enrichRouteWithElevation(line: GeoJSON.LineString) {
			const { densifyLine, sampleElevation, statsFromElevations } = await import(
				'$lib/services/elevation'
			);
			const { ELEVATION_MAX_SAMPLES } = await import('$lib/config/env');
			const target = Math.min(ELEVATION_MAX_SAMPLES, line.coordinates.length * 10);
			const densified = densifyLine(line, target);
			try {
				const elev = await sampleElevation(densified);
				const stats = statsFromElevations(elev);
				update((s) => {
					const newLine: GeoJSON.LineString = { type: 'LineString', coordinates: densified };
					pathStore.set(newLine);
					return { ...s, route: newLine, elevations: elev, elevationStats: stats };
				});
			} catch (err) {
				console.error('elevation failed', err);
				update((s) => ({ ...s, elevations: undefined, elevationStats: undefined }));
			}
		},
		set,
	};
}

export const routeStore = createRouteStore();
