/**
 * Simulated network latency for mock services, so loading states are real.
 * Skipped during server rendering so marketing pages don't pay the cost.
 */
export function mockLatency(baseMs: number, jitterMs = 150): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const ms = baseMs + Math.round(Math.random() * jitterMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolves with the promise's value, but never sooner than `minMs` (keeps loaders from flashing). */
export async function atLeast<T>(promise: Promise<T>, minMs: number): Promise<T> {
  const [value] = await Promise.all([promise, new Promise((resolve) => setTimeout(resolve, minMs))]);
  return value;
}
