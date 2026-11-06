/**
 * GDELT 2.0 DOC API provider
 * 
 * Endpoint: https://api.gdeltproject.org/api/v2/doc/doc
 * Documentation: https://blog.gdeltproject.org/gdelt-doc-2-0-api-supports-jsonfeed/
 * 
 * Query parameters:
 *   query   - search query (required)
 *   mode    - artlist (list of articles) or artfeed (feed format)
 *   format  - json
 *   maxrecords - max number of records (default 250, max 250)
 *   timespan - e.g. "24h", "48h", "7d", "30d"
 *   startdatetime - YYYYMMDDHHMMSS
 *   enddatetime - YYYYMMDDHHMMSS
 *   country - country code filter
 *   lang - language code
 *   sort - datelisted (default)
 *   overlap - remove duplicates (default on)
 *   image - include images
 *   trans - translation
 *   ssl - https links
 * 
 * Response: array of article objects with fields:
 *   url, title, seendate, socialimage, domain, language, sourcecountry
 *   weburl, author, audio, video, themes, locations, persons, organizations
 *   tone, date, dt, duplicate, image, ...
 */

import axios, { AxiosInstance, AxiosError } from 'axios'
import { CONFIG } from '../config'
import { newsCache } from './cache'
import type { Category } from '../config'

// Rate limiting for GDELT requests (1 request per second minimum)
let lastGdeltRequest = 0

const gdeltClient: AxiosInstance = axios.create({
  baseURL: CONFIG.GDALT_DOC_API,
  timeout: 30000,
  headers: {
    'User-Agent': 'WORLDVIEW/1.0 (global-news-intelligence; contact@worldview.app)',
  },
})

const waitForRateLimit = async (): Promise<void> => {
  const now = Date.now()
  const elapsed = now - lastGdeltRequest
  const minInterval = CONFIG.GDALT_REQUEST_INTERVAL_MS
  if (elapsed < minInterval) {
    await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed))
  }
  lastGdeltRequest = Date.now()
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export interface RawGdeltArticle {
  url: string
  title: string
  seendate: string
  socialimage?: string | null
  domain: string
  language: string
  sourcecountry: string
  weburl?: string
  author?: string | null
  audio?: string[]
  video?: string[]
  themes?: string[]
  locations?: string[]
  persons?: string[]
  organizations?: string[]
  tone?: number
  date?: string
  dt?: string
  duplicate?: boolean
  image?: string | null
  [key: string]: unknown
}

export interface RawGdeltResponse {
  articles: RawGdeltArticle[]
  version: string
  total: number
}

const CATEGORY_KEYWORDS: Record<Category, string[]> = (CONFIG.CATEGORIES as unknown) as Record<Category, string[]>

export const classifyCategory = (
  title: string,
  themes?: string[],
  locations?: string[],
): Category => {
  const text = `${title} ${(themes || []).join(' ')}`.toLowerCase()

  const scores: Record<Category, number> = {} as Record<Category, number>
  for (const cat of Object.keys(CATEGORY_KEYWORDS) as Category[]) {
    scores[cat] = 0
    for (const keyword of CATEGORY_KEYWORDS[cat]) {
      if (text.includes(keyword.toLowerCase())) {
        scores[cat] += 1
      }
    }
  }

  let bestCategory: Category = 'politics'
  let bestScore = 0
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      bestCategory = cat as Category
    }
  }

  return bestCategory
}

export const parseGdeltDate = (dateStr?: string): string | null => {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d.toISOString()
  } catch {
    return null
  }
}

export const fetchGdeltNews = async (
  query: string,
  options: {
    timespan?: string
    maxRecords?: number
    category?: Category
    retryCount?: number
  } = {},
): Promise<RawGdeltArticle[]> => {
  const {
    timespan = CONFIG.DEFAULT_TIMESPAN,
    maxRecords = 100,
    retryCount = 3,
  } = options

  const cacheKey = `gdelt:${query}:${timespan}:${maxRecords}`
  const cached = newsCache.get<RawGdeltArticle[]>(cacheKey)
  if (cached) {
    return cached
  }

  let lastError: unknown = null

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    await waitForRateLimit()

    try {
      const response = await gdeltClient.get<RawGdeltResponse>('', {
        params: {
          query,
          mode: 'artlist',
          format: 'json',
          maxrecords: Math.min(maxRecords, CONFIG.MAX_ARTICLES_PER_REQUEST),
          timespan,
          sort: 'datelisted',
          overlap: 'off',
          image: 1,
          ssl: 1,
        },
      })

      const articles = response.data?.articles || []
      newsCache.set(cacheKey, articles, CONFIG.CACHE_NEWS_TTL)
      return articles
    } catch (error: unknown) {
      lastError = error

      if (axios.isAxiosError(error)) {
        const status = error.response?.status

        // Rate limited (429) or server error (5xx) - retry with backoff
        if (status === 429 || (status && status >= 500)) {
          const retryAfter = error.response?.headers?.['retry-after']
          const waitMs = retryAfter
            ? parseInt(String(retryAfter), 10) * 1000
            : Math.pow(2, attempt) * 1000 // exponential backoff: 1s, 2s, 4s

          if (attempt < retryCount) {
            await sleep(waitMs)
            continue
          }
        }

        throw new Error(
          `GDELT API error: ${status || error.message}`,
        )
      }

      throw new Error('GDELT API request failed')
    }
  }

  throw new Error(
    lastError instanceof Error ? lastError.message : 'GDELT API request failed after retries',
  )
}

/**
 * Search news by topic/query
 */
export const searchNews = async (
  query: string,
  timespan: string = '7d',
  maxRecords: number = 100,
): Promise<RawGdeltArticle[]> => {
  return fetchGdeltNews(query, { timespan, maxRecords })
}

/**
 * Get news by country code
 */
export const newsByCountry = async (
  countryCode: string,
  timespan: string = '24h',
  maxRecords: number = 100,
): Promise<RawGdeltArticle[]> => {
  const query = `sourcecountry:${countryCode}`
  return fetchGdeltNews(query, { timespan, maxRecords })
}

/**
 * Get top global news
 */
export const getGlobalNews = async (
  timespan: string = '24h',
  maxRecords: number = 100,
): Promise<RawGdeltArticle[]> => {
  // Use a broad query for major international news
  const query = '(conflict OR politics OR economy OR disaster OR technology OR climate)'
  return fetchGdeltNews(query, { timespan, maxRecords })
}
