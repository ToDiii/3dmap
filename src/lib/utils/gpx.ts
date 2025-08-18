export function lineStringToGpx(name: string, line: GeoJSON.LineString): string {
  const pts = line.coordinates
    .map(([lon, lat]) => `<trkpt lon="${lon}" lat="${lat}"></trkpt>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="3dmap"><trk><name>${
    name
  }</name><trkseg>${pts}</trkseg></trk></gpx>`;
}
