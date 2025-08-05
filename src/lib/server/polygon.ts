function isCoordinate(p: any): p is [number, number] {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    typeof p[0] === 'number' &&
    typeof p[1] === 'number' &&
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1])
  );
}

export function parsePolygon(input: any): GeoJSON.Polygon | null {
  if (!input) return null;
  let ring: any;
  if (input.type === 'Polygon' && Array.isArray(input.coordinates)) {
    ring = input.coordinates[0];
  } else if (Array.isArray(input)) {
    ring = input;
  } else {
    return null;
  }

  if (!Array.isArray(ring) || ring.length < 4 || !ring.every(isCoordinate)) {
    return null;
  }

  const closed =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  const coords = closed ? ring : [...ring, ring[0]];
  return { type: 'Polygon', coordinates: [coords] };
}
