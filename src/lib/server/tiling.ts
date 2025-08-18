import type * as GeoJSON from 'geojson';

const R = 6378137; // earth radius in meters

export function polygonAreaKm2(polygon: GeoJSON.Polygon): number {
  const coords = polygon.coordinates[0];
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[(i + 1) % coords.length];
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dLam = ((lon2 - lon1) * Math.PI) / 180;
    area += dLam * (2 + Math.sin(phi1) + Math.sin(phi2));
  }
  return Math.abs((area * R * R) / 2) / 1_000_000;
}

export function bboxAreaKm2(bbox: [number, number, number, number]): number {
  const poly: GeoJSON.Polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[1]],
        [bbox[2], bbox[3]],
        [bbox[0], bbox[3]],
        [bbox[0], bbox[1]]
      ]
    ]
  };
  return polygonAreaKm2(poly);
}

export function bboxToTiles(
  [w, s, e, n]: [number, number, number, number],
  tileDeg: number
): Array<[number, number, number, number]> {
  const tiles: Array<[number, number, number, number]> = [];
  for (let lon = w; lon < e; lon += tileDeg) {
    for (let lat = s; lat < n; lat += tileDeg) {
      tiles.push([
        lon,
        lat,
        Math.min(lon + tileDeg, e),
        Math.min(lat + tileDeg, n)
      ]);
    }
  }
  return tiles;
}

export function splitPolygonToBboxes(
  polygon: GeoJSON.Polygon,
  tileDeg: number
): Array<[number, number, number, number]> {
  const bbox = polygonToBbox(polygon);
  return bboxToTiles(bbox, tileDeg);
}

export function polygonToBbox(polygon: GeoJSON.Polygon): [number, number, number, number] {
  let minLon = Infinity,
    minLat = Infinity,
    maxLon = -Infinity,
    maxLat = -Infinity;
  for (const [lon, lat] of polygon.coordinates[0]) {
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLon, minLat, maxLon, maxLat];
}
