export interface GeocodeResult {
	lat: number;
	lon: number;
	label: string;
}

/**
 * Calls server-side geocode proxy.
 */
export async function geocodeAddress(q: string): Promise<GeocodeResult[]> {
	const res = await fetch('/api/geocode', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ q }),
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || 'geocode failed');
	return data.results as GeocodeResult[];
}
