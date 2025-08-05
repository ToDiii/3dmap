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
  for (const element of data.elements || []) {
    if (element.geometry) {
      if (minArea > 0 && element.tags?.building) {
        const area = polygonArea(element.geometry);
        if (area < minArea) continue;
      }
      const coords = element.geometry.map((p: any) => [p.lon * scale, baseHeight, p.lat * scale]);
      let height = 0;
      if (element.tags?.height) {
        const m = /([0-9.]+)/.exec(element.tags.height);
        if (m) height = parseFloat(m[1]);
      } else if (element.tags?.['building:levels']) {
        height = parseFloat(element.tags['building:levels']) * 3;
      }
      if (element.tags?.building) {
        height = height * buildingMultiplier + baseHeight;
      }
      features.push({
        id: element.id,
        type: element.tags?.building
          ? 'building'
          : element.tags?.highway
          ? 'road'
          : element.tags?.natural === 'water'
          ? 'water'
          : element.tags?.leisure === 'park' || element.tags?.landuse === 'grass'
          ? 'green'
          : 'other',
        geometry: coords,
        height
      });
    }
  }
  return { features };
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
