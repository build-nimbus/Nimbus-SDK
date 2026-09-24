/**
 * In-memory result cache.
 *
 * Two jobs:
 *  1. TTL cache (30s) — a wallet's balance doesn't change fast enough to
 *     justify hitting the API on every re-render.
 *  2. In-flight dedupe — if five <TotymGate>s mount with the same query,
 *     they share one network request instead of stampeding the API.
 *
 * Module-level singleton on purpose: cache scope is "this page load",
 * which is exactly what we want for a client SDK.
 */

const TTL_MS = 30_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export function cacheKey(parts: Record<string, unknown>): string {
  // Sort keys so { a, b } and { b, a } hit the same entry.
  return JSON.stringify(parts, Object.keys(parts).sort());
}

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value as T;
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = fetcher()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/** Drop everything — used after wallet changes if a hard refresh is needed. */
export function clearCache(): void {
  cache.clear();
}
