export function buildOverpassQuery(
  elements: string[],
  bbox?: [number, number, number, number]
): string {
  // bbox expected as [south, west, north, east]
  const bboxPart = bbox ? `(${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]})` : '';
  let query = '[out:json][timeout:25];(';
  if (elements.includes('buildings')) {
    query += `way["building"]${bboxPart};relation["building"]${bboxPart};`;
  }
  if (elements.includes('roads')) {
    query += `way["highway"]${bboxPart};`;
  }
  if (elements.includes('water')) {
    query += `way["natural"="water"]${bboxPart};relation["natural"="water"]${bboxPart};`;
  }
  query += ');out geom;';
  return query;
}

export function convertTo3D(data: any, scale: number, baseHeight: number, buildingMultiplier: number) {
  const features: any[] = [];
  for (const element of data.elements || []) {
    if (element.geometry) {
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
        type: element.tags?.building ? 'building' : element.tags?.highway ? 'road' : 'water',
        geometry: coords,
        height
      });
    }
  }
  return { features };
}

export type ModelResult = ReturnType<typeof convertTo3D>;
