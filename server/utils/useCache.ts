import { LRUCache } from 'lru-cache'

// Create a shared cache instance (only once for your app)
const cache = new LRUCache<string, any>({
  max: 100,
  ttl: 1000 * 60 * 5, // default 5 minutes in ms
})

/**
 * Fetches data and caches it under `key`.
 * If the key already exists and is unexpired, returns the cached value.
 * @param key Unique cache key
 * @param fetchData An async function that loads fresh data
 * @param ttlInMin calculated Override default TTL (in minutes)
 */
export default async function<T>(
  key: string,
  fetchData: () => Promise<T>,
  ttlInMin: number = 5
): Promise<T> {
  // Try to get from cache
  const cached = cache.get(key) as T | undefined
  
  if (cached !== undefined) {
    // cache hit
    return cached
  }



  // cache miss: fetch fresh data
  const data = await fetchData()

  // store in cache with optional per-entry TTL
  cache.set(key, data, { ttl: 1000 * 60 * ttlInMin })

  return data
}
