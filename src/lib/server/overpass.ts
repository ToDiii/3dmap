import type * as GeoJSON from 'geojson';
import { mapBuildingSubtype } from '$lib/constants/palette';
import intersect from '@turf/intersect';
import area from '@turf/area';

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
  minArea = 0,
  clipPolygon?: GeoJSON.Polygon,
  minBuildingHeightMM = 0
) {
  const features: any[] = [];
  const geoFeatures: GeoJSON.Feature[] = [];
  for (const element of data.elements || []) {
    if (!element.geometry) continue;
    const tags = element.tags || {};
    const featureType = tags.building
      ? 'building'
      : tags.natural === 'water'
      ? 'water'
      : tags.leisure === 'park' || tags.landuse === 'grass'
      ? 'green'
      : tags.highway
      ? 'road'
      : 'other';
    const name = tags.name;
    if (featureType === 'building') {
      let poly = element.geometry.map((p: any) => [p.lon, p.lat]);
      if (poly.length > 0 && (poly[0][0] !== poly[poly.length - 1][0] || poly[0][1] !== poly[poly.length - 1][1])) {
        poly.push(poly[0]);
      }
      let polys = [poly];
      if (clipPolygon) {
        let clipped: any;
        try {
          clipped = intersect(
            { type: 'Feature', geometry: { type: 'Polygon', coordinates: [poly] }, properties: {} } as any,
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
        if (minArea > 0 && a < minArea) continue;
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
          featureType,
          name,
          area_m2: a
        };
        if (subtype) props.subtype = subtype;
        if (tags['building:levels']) props.levels = tags['building:levels'];
        if (tags.height) props.height = tags.height;
        geoFeatures.push({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [polyCoords] },
          properties: props
        });
      }
      continue;
    }
    const coords = element.geometry.map((p: any) => [p.lon * scale, baseHeight, p.lat * scale]);
    features.push({ id: element.id, type: featureType, geometry: coords, height: baseHeight });
    if (featureType === 'water' || featureType === 'green') {
      const poly = element.geometry.map((p: any) => [p.lon, p.lat]);
      if (poly.length > 0 && (poly[0][0] !== poly[poly.length - 1][0] || poly[0][1] !== poly[poly.length - 1][1])) {
        poly.push(poly[0]);
      }
      geoFeatures.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [poly] },
        properties: {
          height_raw: 0,
          base_height: baseHeight,
          height_final: baseHeight,
          featureType,
          name
        }
      });
    }
  }
  const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: geoFeatures };
  return { features, geojson };
}

export type ModelResult = ReturnType<typeof convertTo3D>;

