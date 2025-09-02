export interface RouteResult {
	geometry: GeoJSON.LineString;
	distanceKm?: number;
	durationMin?: number;
}

export async function routeWaypoints(coords: Array<[number, number]>): Promise<RouteResult> {
	const res = await fetch('/api/route', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ coords }),
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || 'route failed');
	return data.result as RouteResult;
}
