import buffer from '@turf/buffer';
import { lineString } from '@turf/helpers';
import type * as GeoJSON from 'geojson';

export function bufferLine(line: GeoJSON.LineString, meters: number): GeoJSON.Polygon {
	const feat = lineString(line.coordinates);
	const buf = buffer(feat, meters, { units: 'meters' });
	return buf!.geometry as GeoJSON.Polygon;
}
