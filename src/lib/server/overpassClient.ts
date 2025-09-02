import { env } from './env';

export type OverpassClientConfig = {
	endpoints: string[];
	timeoutMs: number;
	maxRetries: number;
	retryBaseMs: number;
	concurrency: number;
	userAgent: string;
};

export const config: OverpassClientConfig = {
	endpoints: env.OVERPASS_ENDPOINTS,
	timeoutMs: env.OVERPASS_TIMEOUT_MS,
	maxRetries: env.OVERPASS_MAX_RETRIES,
	retryBaseMs: env.OVERPASS_RETRY_BASE_MS,
	concurrency: env.OVERPASS_CONCURRENCY,
	userAgent: env.OVERPASS_USER_AGENT,
};

export function setConfig(partial: Partial<OverpassClientConfig>) {
	Object.assign(config, partial);
}

let endpointCursor = 0;
const inflight = new Map<string, Promise<any>>();
let active = 0;
const queue: (() => void)[] = [];

function acquire() {
	if (active < config.concurrency) {
		active++;
		return Promise.resolve(() => release());
	}
	return new Promise<() => void>((resolve) => {
		queue.push(() => {
			active++;
			resolve(() => release());
		});
	});
}

function release() {
	active--;
	const next = queue.shift();
	if (next) next();
}

function delay(ms: number) {
	return new Promise((res) => setTimeout(res, ms));
}

export async function fetchOverpass(
	query: string
): Promise<{ data: any; meta: { endpointUsed: string; attempts: number; durationMs: number } }> {
	if (inflight.has(query)) return inflight.get(query)!;

	const run = async () => {
		const start = Date.now();
		let attempts = 0;
		let lastError: any;
		let endpointUsed = '';
		while (attempts <= config.maxRetries) {
			const endpoint = config.endpoints[endpointCursor++ % config.endpoints.length];
			endpointUsed = endpoint;
			attempts++;
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
			try {
				const res = await fetch(endpoint, {
					method: 'POST',
					body: query,
					signal: controller.signal,
					headers: { 'User-Agent': config.userAgent },
				});
				clearTimeout(timeout);
				if (!res.ok) {
					if ([429, 503, 504].includes(res.status)) {
						lastError = Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
					} else if (res.status >= 400 && res.status < 500) {
						throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
					} else {
						lastError = Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
					}
				} else {
					const data = await res.json();
					const durationMs = Date.now() - start;
					return { data, meta: { endpointUsed, attempts, durationMs } };
				}
			} catch (err: any) {
				clearTimeout(timeout);
				if (err.name === 'AbortError') {
					lastError = Object.assign(new Error('timeout'), { status: 504 });
				} else if (err.status) {
					lastError = err;
				} else {
					lastError = Object.assign(err, { status: 503 });
				}
			}
			if (attempts > config.maxRetries) break;
			const delayMs = config.retryBaseMs * Math.pow(2, attempts - 1) * (0.8 + Math.random() * 0.4);
			await delay(delayMs);
		}
		throw lastError;
	};

	const p = acquire().then(async (release) => {
		try {
			return await run();
		} finally {
			release();
		}
	});
	inflight.set(query, p);
	try {
		return await p;
	} finally {
		inflight.delete(query);
	}
}
