function shouldRetry(err: any) {
  const status = err?.status;
  if (!status) return true; // network error
  return status === 429 || status === 503 || status === 504;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RetryOpts {
  maxRetries: number;
  baseMs: number;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOpts): Promise<{
  result: T;
  attempts: number;
  durationMs: number;
}> {
  const start = Date.now();
  let attempt = 0;
  while (true) {
    try {
      const result = await fn();
      return { result, attempts: attempt + 1, durationMs: Date.now() - start };
    } catch (err: any) {
      if (attempt >= opts.maxRetries || !shouldRetry(err)) throw err;
      const delay = opts.baseMs * Math.pow(2, attempt) + Math.random() * 100;
      attempt++;
      await wait(delay);
    }
  }
}
