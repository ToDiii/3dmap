import { env } from './env';

type Bucket = 'geocode' | 'route';

interface Counter { count: number; ts: number }

const counters = new Map<Bucket, Counter>();

export function allowRequest(bucket: Bucket): boolean {
  const limit = env.API_RATE_LIMIT_PER_MIN;
  const now = Date.now();
  const entry = counters.get(bucket);
  if (!entry || now - entry.ts >= 60_000) {
    counters.set(bucket, { count: 1, ts: now });
    return true;
  }
  if (entry.count < limit) {
    entry.count++;
    return true;
  }
  return false;
}
