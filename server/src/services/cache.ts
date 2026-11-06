import NodeCache from 'node-cache'

// Cache with TTL support and stats
export class CacheService {
  private cache: NodeCache

  constructor(ttlSeconds: number = 300) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: 120,
      useClones: false,
    })
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key)
  }

  set<T>(key: string, value: T, ttlSeconds: number = 300): boolean {
    return this.cache.set(key, value, ttlSeconds)
  }

  del(key: string): number {
    return this.cache.del(key)
  }

  flush(): void {
    this.cache.flushAll()
  }

  getStats() {
    return this.cache.getStats()
  }

  keys(): string[] {
    return this.cache.keys()
  }
}

export const newsCache = new CacheService(600) // 10 min default
export const geocodeCache = new CacheService(86400 * 7) // 7 days
export const searchCache = new CacheService(300) // 5 min
