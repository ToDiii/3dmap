import { existsSync, readFileSync, writeFileSync } from 'fs';

interface CacheOptions {
	ttlMs: number;
	maxEntries: number;
	persistFile?: string;
}

type Entry<T> = { value: T; expires: number };

export function createCache<T>({ ttlMs, maxEntries, persistFile }: CacheOptions) {
	let store = new Map<string, Entry<T>>();

	if (persistFile && existsSync(persistFile)) {
		try {
			const raw = JSON.parse(readFileSync(persistFile, 'utf-8')) as Array<[string, Entry<T>]>;
			store = new Map(raw.filter(([_, entry]) => entry.expires > Date.now()));
		} catch (err) {
			console.error('Failed to load cache', err);
		}
	}

	function save() {
		if (!persistFile) return;
		try {
			writeFileSync(persistFile, JSON.stringify(Array.from(store.entries())));
		} catch (err) {
			console.error('Failed to persist cache', err);
		}
	}

	function cleanup() {
		const now = Date.now();
		for (const [key, entry] of store.entries()) {
			if (entry.expires <= now) store.delete(key);
		}
	}

	function get(key: string): T | undefined {
		cleanup();
		const entry = store.get(key);
		if (!entry) return undefined;
		if (entry.expires <= Date.now()) {
			store.delete(key);
			save();
			return undefined;
		}
		return entry.value;
	}

	function has(key: string): boolean {
		cleanup();
		return store.has(key);
	}

	function set(key: string, value: T) {
		cleanup();
		if (store.size >= maxEntries) {
			const oldest = store.keys().next().value;
			if (oldest) store.delete(oldest);
		}
		store.set(key, { value, expires: Date.now() + ttlMs });
		save();
	}

	return { get, set, has } as const;
}

export type Cache<T> = ReturnType<typeof createCache<T>>;
