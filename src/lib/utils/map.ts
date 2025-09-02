import type maplibregl from 'maplibre-gl';

export function onMapLoaded(map: maplibregl.Map, cb: () => void): void {
	if (map.isStyleLoaded()) {
		cb();
	} else {
		map.once('style.load', cb);
	}
}
