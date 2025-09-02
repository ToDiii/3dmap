import { describe, it, expect } from 'vitest';
import { getShortcuts, filterShortcuts } from './shortcuts';

describe('shortcuts registry', () => {
	it('has unique combos', () => {
		const sc = getShortcuts();
		const combos = new Set(sc.map((s) => s.combo.toLowerCase()));
		expect(combos.size).toBe(sc.length);
	});

	it('filters by query', () => {
		const res = filterShortcuts('Export');
		expect(res.every((s) => s.group === 'Export' || s.title.startsWith('Export'))).toBe(true);
	});
});
