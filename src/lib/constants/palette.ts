export const COLORS = {
	building_residential: '#6aa7ff',
	building_commercial: '#4f7bd9',
	building_industrial: '#7189aa',
	water: '#7ec8e3',
	green: '#78c27a',
	route: '#ff524f',
} as const;

export const SLOPE_GRADIENT = [
	{ pct: 0, color: '#48c774' },
	{ pct: 0.05, color: '#ffd166' },
	{ pct: 0.08, color: '#f8961e' },
	{ pct: 0.12, color: '#ef476f' },
] as const;

export function mapBuildingSubtype(
	tags: Record<string, any> = {}
): 'building_residential' | 'building_commercial' | 'building_industrial' | 'building_generic' {
	const b = String(tags.building || '').toLowerCase();
	const amenity = String(tags.amenity || '').toLowerCase();
	const shop = String(tags.shop || '').toLowerCase();

	const residential = new Set([
		'house',
		'residential',
		'apartments',
		'detached',
		'terrace',
		'semidetached_house',
		'dormitory',
		'hotel',
	]);
	const commercial = new Set(['retail', 'commercial', 'office']);
	const industrial = new Set(['industrial', 'warehouse', 'factory']);

	if (industrial.has(b)) return 'building_industrial';
	if (commercial.has(b) || amenity || shop) return 'building_commercial';
	if (residential.has(b)) return 'building_residential';
	return 'building_generic';
}

function lerpColor(a: string, b: string, t: number): string {
	const ah = parseInt(a.slice(1), 16);
	const bh = parseInt(b.slice(1), 16);
	const ar = (ah >> 16) & 0xff;
	const ag = (ah >> 8) & 0xff;
	const ab = ah & 0xff;
	const br = (bh >> 16) & 0xff;
	const bg = (bh >> 8) & 0xff;
	const bb = bh & 0xff;
	const rr = Math.round(ar + (br - ar) * t);
	const rg = Math.round(ag + (bg - ag) * t);
	const rb = Math.round(ab + (bb - ab) * t);
	return `#${rr.toString(16).padStart(2, '0')}${rg
		.toString(16)
		.padStart(2, '0')}${rb.toString(16).padStart(2, '0')}`;
}

export function interpolateSlopeColor(grade: number, stops = SLOPE_GRADIENT): string {
	const g = Math.abs(grade);
	for (let i = 0; i < stops.length; i++) {
		if (g <= stops[i].pct) {
			if (i === 0) return stops[0].color;
			const prev = stops[i - 1];
			const t = (g - prev.pct) / (stops[i].pct - prev.pct);
			return lerpColor(prev.color, stops[i].color, t);
		}
	}
	return stops[stops.length - 1].color;
}
