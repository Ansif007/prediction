const CACHE_PREFIX = "app_cache_";

let matchCache: { data: unknown; timestamp: number } | null = null;

export function getCache<T>(key: string): { data: T; stale: boolean } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;
    return { data: entry.data as T, stale: age > 300_000 };
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

export function getCachedMatches<T>(): { data: T; stale: boolean } | null {
  if (!matchCache) return null;
  const age = Date.now() - matchCache.timestamp;
  return { data: matchCache.data as T, stale: age > 60_000 };
}

export function setCachedMatches<T>(data: T): void {
  matchCache = { data, timestamp: Date.now() };
}

export function clearMatchCache(): void {
  matchCache = null;
}
