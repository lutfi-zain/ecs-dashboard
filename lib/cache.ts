// Cache utility untuk ECS Dashboard
const CACHE_PREFIX = 'ecs-dashboard-'
const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

export class DataCache {
  private static isClient = typeof window !== 'undefined'

  static set<T>(key: string, data: T, expiryMs: number = CACHE_EXPIRY_MS): void {
    if (!this.isClient) return

    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + expiryMs
      }
      
      localStorage.setItem(
        `${CACHE_PREFIX}${key}`,
        JSON.stringify(cacheEntry)
      )
    } catch (error) {
      console.warn('Failed to cache data:', error)
    }
  }

  static get<T>(key: string): T | null {
    if (!this.isClient) return null

    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`)
      if (!cached) return null

      const cacheEntry: CacheEntry<T> = JSON.parse(cached)
      
      // Check if cache is expired
      if (Date.now() > cacheEntry.expiry) {
        this.remove(key)
        return null
      }

      return cacheEntry.data
    } catch (error) {
      console.warn('Failed to read cache:', error)
      this.remove(key)
      return null
    }
  }

  static remove(key: string): void {
    if (!this.isClient) return

    try {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`)
    } catch (error) {
      console.warn('Failed to remove cache:', error)
    }
  }

  static clear(): void {
    if (!this.isClient) return

    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(CACHE_PREFIX))
        .forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }

  static isExpired(key: string): boolean {
    if (!this.isClient) return true

    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`)
      if (!cached) return true

      const cacheEntry: CacheEntry<any> = JSON.parse(cached)
      return Date.now() > cacheEntry.expiry
    } catch (error) {
      return true
    }
  }
}

// API fetch utility dengan caching
export class APICache {
  static async fetchWithCache<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheExpiryMs: number = CACHE_EXPIRY_MS
  ): Promise<T> {
    const key = cacheKey || endpoint

    // Try cache first
    const cached = DataCache.get<T>(key)
    if (cached) {
      return cached
    }

    // Fetch from API
    const response = await fetch(endpoint, {
      cache: 'no-store',
      ...options
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Cache the result
    DataCache.set(key, data, cacheExpiryMs)
    
    return data
  }

  static invalidateCache(key: string): void {
    DataCache.remove(key)
  }

  static clearAllCache(): void {
    DataCache.clear()
  }
}