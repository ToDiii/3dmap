import type * as GeoJSON from 'geojson';
import { mapBuildingSubtype } from '$lib/constants/palette';

export function buildOverpassQuery(
  elements: string[],
  bbox?: [number, number, number, number],
  shape?: GeoJSON.Polygon
): string {
  // area restriction: prefer shape polygon, fallback to bbox
  const areaPart = shape
    ? `(poly:"${shape.coordinates[0]
        .map(([lng, lat]) => `${lat} ${lng}`)
        .join(' ')}")`
    : bbox
    ? `(${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]})`
    : '';
  let query = '[out:json][timeout:25];(';
  if (elements.includes('buildings')) {
    query += `way["building"]${areaPart};relation["building"]${areaPart};`;
  }
  if (elements.includes('roads')) {
    query += `way["highway"]${areaPart};`;
  }
  if (elements.includes('water')) {
    query += `way["natural"="water"]${areaPart};relation["natural"="water"]${areaPart};`;
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
  minArea = 0
) {
  const features: any[] = [];
  const geoFeatures: GeoJSON.Feature[] = [];
  for (const element of data.elements || []) {
    if (!element.geometry) continue;

    if (minArea > 0 && element.tags?.building) {
      const area = polygonArea(element.geometry);
      if (area < minArea) continue;
    }

    // 3D geometry for viewer/export
    const coords = element.geometry.map((p: any) => [p.lon * scale, baseHeight, p.lat * scale]);
    let heightRaw = 0;
    if (element.tags?.height) {
      const m = /([0-9.]+)/.exec(element.tags.height);
      if (m) heightRaw = parseFloat(m[1]);
    } else if (element.tags?.['building:levels']) {
      heightRaw = parseFloat(element.tags['building:levels']) * 3;
    } else if (element.tags?.building) {
      heightRaw = 10;
    }
    const featureType = element.tags?.building
      ? 'building'
      : element.tags?.natural === 'water'
      ? 'water'
      : element.tags?.leisure === 'park' || element.tags?.landuse === 'grass'
      ? 'green'
      : element.tags?.highway
      ? 'road'
      : 'other';
    const name = element.tags?.name;
    const subtype = featureType === 'building' ? mapBuildingSubtype(element.tags) : undefined;
    let height = 0;
    if (featureType === 'building') {
      height = heightRaw * buildingMultiplier + baseHeight;
    }
    features.push({ id: element.id, type: featureType, geometry: coords, height, subtype });

    // GeoJSON output for map rendering
    if (featureType === 'building' || featureType === 'water' || featureType === 'green') {
      const poly = element.geometry.map((p: any) => [p.lon, p.lat]);
      if (poly.length > 0 && (poly[0][0] !== poly[poly.length - 1][0] || poly[0][1] !== poly[poly.length - 1][1])) {
        poly.push(poly[0]);
      }
      const heightFinal =
        featureType === 'building' ? baseHeight + heightRaw * buildingMultiplier : baseHeight;
      const props: any = {
        height_raw: heightRaw,
        base_height: baseHeight,
        height_final: heightFinal,
        featureType,
        name
      };
      if (featureType === 'building') {
        if (subtype) props.subtype = subtype;
        if (element.tags?.['building:levels']) props.levels = element.tags['building:levels'];
        if (element.tags?.height) props.height = element.tags.height;
      }
      geoFeatures.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [poly] },
        properties: props
      });
    }
  }
  const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: geoFeatures };
  return { features, geojson };
}

export type ModelResult = ReturnType<typeof convertTo3D>;

function polygonArea(geometry: { lat: number; lon: number }[]): number {
  const R = 6378137;
  let area = 0;
  for (let i = 0, len = geometry.length; i < len; i++) {
    const p1 = geometry[i];
    const p2 = geometry[(i + 1) % len];
    const lon1 = (p1.lon * Math.PI) / 180;
    const lon2 = (p2.lon * Math.PI) / 180;
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs((area * R * R) / 2);
}
