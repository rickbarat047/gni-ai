import express, { Request, Response, NextFunction } from 'express'
import {
  fetchGdeltNews,
  searchNews,
  newsByCountry,
  getGlobalNews,
} from '../services/newsProvider'
import { processNewsArticles } from '../services/normalization'
import { filterByViewport, filterByCategory, filterByTime } from '../services/normalization'
import { geocodeLocation, reverseGeocode } from '../services/geocoding'
import { newsCache, searchCache, geocodeCache } from '../services/cache'
import { CONFIG } from '../config'

const router = express.Router()

// Async handler wrapper
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }

// GET /api/news - Get processed news articles
router.get(
  '/news',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      query,
      timespan = '24h',
      maxRecords = '100',
      category,
      timeRange,
      bbox,
      lat,
      lon,
    } = req.query

    const cacheKey = `news:${query || 'global'}:${timespan}:${maxRecords}:${category || 'all'}:${timeRange || '24h'}:${bbox || ''}`
    const cached = newsCache.get<any[]>(cacheKey)
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        count: cached.length,
        data: cached,
        timestamp: new Date().toISOString(),
      })
    }

    let rawArticles: any[] = []

    try {
      if (query) {
        rawArticles = await searchNews(query as string, timespan as string, parseInt(maxRecords as string, 10))
      } else if (lat && lon) {
        // Reverse geocode then get news by country
        const reverse = await reverseGeocode(parseFloat(lat as string), parseFloat(lon as string))
        if (reverse?.countryCode) {
          rawArticles = await newsByCountry(reverse.countryCode.toUpperCase(), timespan as string, parseInt(maxRecords as string, 10))
        } else {
          rawArticles = await getGlobalNews(timespan as string, parseInt(maxRecords as string, 10))
        }
      } else {
        rawArticles = await getGlobalNews(timespan as string, parseInt(maxRecords as string, 10))
      }

      const processed = await processNewsArticles(rawArticles)

      // Apply filters
      let filtered = processed
      if (category) {
        filtered = filterByCategory(filtered, category as string)
      }
      if (timeRange) {
        filtered = filterByTime(filtered, timeRange as any)
      }
      if (bbox) {
        const [west, south, east, north] = bbox
          .toString()
          .split(',')
          .map(parseFloat)
        filtered = filterByViewport(filtered, { west, south, east, north })
      }

      // Limit results
      const limited = filtered.slice(0, CONFIG.MAX_ARTICLES_DISPLAY)

      newsCache.set(cacheKey, limited, CONFIG.CACHE_NEWS_TTL)

      return res.json({
        success: true,
        cached: false,
        count: limited.length,
        total: filtered.length,
        data: limited,
        timestamp: new Date().toISOString(),
      })
    } catch (error: unknown) {
      // Try to return cached data on error
      const stale = newsCache.keys().filter((k) => k.startsWith('news:'))
      if (stale.length > 0) {
        const firstKey = stale[0]
        const staleData = newsCache.get<any[]>(firstKey)
        if (staleData) {
          return res.json({
            success: true,
            cached: true,
            stale: true,
            count: staleData.length,
            data: staleData,
            timestamp: new Date().toISOString(),
            warning: 'Using cached data due to upstream API error',
          })
        }
      }

      throw error
    }
  }),
)

// GET /api/news/region - Get news for a geographic region (bounding box)
router.get(
  '/news/region',
  asyncHandler(async (req: Request, res: Response) => {
    const { west, south, east, north, timespan = '24h', maxRecords = '200' } = req.query

    if (!west || !south || !east || !north) {
      return res.status(400).json({
        success: false,
        error: 'Missing bounding box parameters: west, south, east, north',
      })
    }

    const bbox = `${west},${south},${east},${north}`
    const cacheKey = `region:${bbox}:${timespan}`
    const cached = newsCache.get<any[]>(cacheKey)
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        count: cached.length,
        data: cached,
        timestamp: new Date().toISOString(),
      })
    }

    // Get global news then filter by viewport server-side
    // (GDELT doesn't support geo bounding box queries)
    const rawArticles = await getGlobalNews(timespan as string, parseInt(maxRecords as string, 10))
    const processed = await processNewsArticles(rawArticles)
    const filtered = filterByViewport(processed, {
      west: parseFloat(west as string),
      south: parseFloat(south as string),
      east: parseFloat(east as string),
      north: parseFloat(north as string),
    })

    const limited = filtered.slice(0, CONFIG.MAX_ARTICLES_DISPLAY)
    newsCache.set(cacheKey, limited, CONFIG.CACHE_NEWS_TTL)

    return res.json({
      success: true,
      cached: false,
      count: limited.length,
      data: limited,
      timestamp: new Date().toISOString(),
    })
  }),
)

// GET /api/news/search - Search news by topic
router.get(
  '/news/search',
  asyncHandler(async (req: Request, res: Response) => {
    const { q, timespan = '7d', maxRecords = '100' } = req.query

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Missing query parameter: q',
      })
    }

    const cacheKey = `search:${q}:${timespan}`
    const cached = searchCache.get<any[]>(cacheKey)
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        count: cached.length,
        data: cached,
        timestamp: new Date().toISOString(),
      })
    }

    const rawArticles = await searchNews(q as string, timespan as string, parseInt(maxRecords as string, 10))
    const processed = await processNewsArticles(rawArticles)

    searchCache.set(cacheKey, processed, CONFIG.CACHE_SEARCH_TTL)

    return res.json({
      success: true,
      cached: false,
      count: processed.length,
      data: processed,
      timestamp: new Date().toISOString(),
    })
  }),
)

// GET /api/news/categories - Get available categories
router.get('/news/categories', (_req: Request, res: Response) => {
  const categories = Object.keys(CONFIG.CATEGORIES).map((key) => ({
    id: key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
  }))

  return res.json({
    success: true,
    data: categories,
  })
})

// GET /api/news/status - Get API status and health
router.get('/news/status', asyncHandler(async (_req: Request, res: Response) => {
  const newsStats = newsCache.getStats()
  const geoStats = geocodeCache.getStats()

  // Test GDELT connectivity
  let gdeltHealthy = false
  let gdeltError: string | null = null
  try {
    await getGlobalNews('1h', 5)
    gdeltHealthy = true
  } catch (error: unknown) {
    gdeltError = error instanceof Error ? error.message : 'Unknown error'
  }

  return res.json({
    success: true,
    timestamp: new Date().toISOString(),
    services: {
      gdelt: {
        healthy: gdeltHealthy,
        error: gdeltError,
        endpoint: CONFIG.GDALT_DOC_API,
      },
      geocoding: {
        healthy: true, // Nominatim is generally available
        endpoint: CONFIG.GEOCODING_BASE,
      },
    },
    cache: {
      news: newsStats,
      geocoding: geoStats,
    },
    config: {
      defaultTimespan: CONFIG.DEFAULT_TIMESPAN,
      maxArticles: CONFIG.MAX_ARTICLES_DISPLAY,
    },
  })
}))

// GET /api/geocode - Geocode a location query
router.get(
  '/geocode',
  asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Missing query parameter: q',
      })
    }

    const result = await geocodeLocation(q as string)

    console.log(`Geocode for "${q}":`, result ? `found ${result.displayName}` : 'null')

    if (!result) {
      return res.json({
        success: true,
        data: null,
        message: 'No geocoding results found',
      })
    }

    return res.json({
      success: true,
      data: result,
    })
  }),
)

// GET /api/geocode/reverse - Reverse geocode coordinates
router.get(
  '/geocode/reverse',
  asyncHandler(async (req: Request, res: Response) => {
    const { lat, lon } = req.query

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Missing parameters: lat, lon',
      })
    }

    const result = await reverseGeocode(parseFloat(lat as string), parseFloat(lon as string))

    return res.json({
      success: true,
      data: result,
    })
  }),
)

// Error handling middleware
router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Error:', err)
  const message = err instanceof Error ? err.message : 'Internal server error'
  const status = message.includes('GDELT API error') ? 502 : 500

  return res.status(status).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  })
})

export default router
