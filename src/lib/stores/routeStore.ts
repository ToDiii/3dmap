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
}

function createRouteStore() {
  const { subscribe, update, set } = writable<RouteState>({ waypoints: [], route: null });

  return {
    subscribe,
    addWaypoint: () =>
      update((s) => ({
        ...s,
        waypoints: [...s.waypoints, { id: Math.random().toString(36).slice(2), address: '' }]
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
    setRoute: (
      route: GeoJSON.LineString | null,
      distanceKm?: number,
      durationMin?: number
    ) =>
      update((s) => {
        pathStore.set(route);
        return { ...s, route, distanceKm, durationMin };
      }),
    resetRoute: () =>
      update((s) => {
        pathStore.set(null);
        return { ...s, route: null, distanceKm: undefined, durationMin: undefined };
      }),
    set
  };
}

export const routeStore = createRouteStore();
