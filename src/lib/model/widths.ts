const defaultRoadWidths: Record<string, number> = {
	motorway: 25,
	trunk: 20,
	primary: 15,
	secondary: 12,
	tertiary: 10,
	residential: 6,
	service: 5,
	footway: 2.5,
	path: 2.5,
};

const defaultWaterwayWidths: Record<string, number> = {
	river: 20,
	canal: 12,
	stream: 4,
	ditch: 2,
	drain: 2,
};

let roadWidths = { ...defaultRoadWidths };
let waterwayWidths = { ...defaultWaterwayWidths };

export function applyCustomOverrides(
	road?: Record<string, number>,
	water?: Record<string, number>
) {
	if (road) roadWidths = { ...roadWidths, ...road };
	if (water) waterwayWidths = { ...waterwayWidths, ...water };
}

export function getRoadWidthMeters(tags: Record<string, string>): number {
	const type = tags.highway as string | undefined;
	if (!type) return 0;
	return roadWidths[type] ?? roadWidths.residential;
}

export function getWaterwayWidthMeters(tags: Record<string, string>): number {
	const type = tags.waterway as string | undefined;
	if (!type) return 0;
	return waterwayWidths[type] ?? waterwayWidths.stream;
}
