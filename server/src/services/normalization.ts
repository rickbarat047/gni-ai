/**
 * News normalization, deduplication, and event clustering
 * 
 * Internal news data model:
 * {
 *   id: string,
 *   title: string,
 *   summary: string,
 *   url: string,
 *   source: string,
 *   sourceCountry: string,
 *   publishedAt: string,
 *   eventLocation: string,
 *   country: string,
 *   region: string,
 *   city: string,
 *   latitude: number | null,
 *   longitude: number | null,
 *   locationPrecision: "city" | "region" | "country" | "unknown",
 *   locationConfidence: number,
 *   category: string,
 *   imageUrl: string | null,
 *   clusterId: string | null,
 *   relatedSources: string[]
 * }
 */

import { CONFIG, Category } from '../config'
import {
  RawGdeltArticle,
  classifyCategory,
  parseGdeltDate,
} from './newsProvider'
import { geocodeLocation, GeocodeResult } from './geocoding'
import { newsCache } from './cache'

// Simple hash for generating IDs
const hashString = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

export interface InternalArticle {
  id: string
  title: string
  summary: string
  url: string
  source: string
  sourceCountry: string
  publishedAt: string
  eventLocation: string
  country: string
  region: string
  city: string
  latitude: number | null
  longitude: number | null
  locationPrecision: 'city' | 'region' | 'country' | 'unknown'
  locationConfidence: number
  category: string
  imageUrl: string | null
  clusterId: string | null
  relatedSources: string[]
}

export interface RawArticleInput {
  title: string
  url: string
  source: string
  sourceCountry: string
  publishedAt: string | null
  summary: string
  imageUrl: string | null
  category: string
  eventLocation: string
  country: string
  region: string
  city: string
  latitude: number | null
  longitude: number | null
  locationPrecision: 'city' | 'region' | 'country' | 'unknown'
  locationConfidence: number
  [key: string]: unknown
}

/**
 * Normalize a raw GDELT article into the internal model
 */
export const normalizeArticle = async (
  raw: RawGdeltArticle,
  geoResult: GeocodeResult | null,
): Promise<InternalArticle | null> => {
  if (!raw.title || !raw.url) {
    return null
  }

  const title = raw.title.trim()
  const url = raw.url.trim()
  const source = raw.domain || 'Unknown'
  const sourceCountry = raw.sourcecountry || 'Unknown'
  const publishedAt = parseGdeltDate(raw.seendate || raw.date) || new Date().toISOString()

  // Build summary from title (GDELT DOC doesn't always have full text)
  const summary = title

  const imageUrl = raw.socialimage || raw.image || null

  const category = classifyCategory(title, raw.themes, raw.locations)

  // Geographical resolution
  let eventLocation = ''
  let country = ''
  let region = ''
  let city = ''
  let latitude: number | null = null
  let longitude: number | null = null
  let locationPrecision: 'city' | 'region' | 'country' | 'unknown' = 'unknown'
  let locationConfidence = 0

  if (geoResult) {
    eventLocation = geoResult.displayName
    country = geoResult.country || ''
    region = geoResult.region || ''
    city = geoResult.city || ''
    latitude = geoResult.latitude
    longitude = geoResult.longitude
    locationPrecision = geoResult.precision
    locationConfidence = geoResult.confidence
  } else if (raw.locations && raw.locations.length > 0) {
    // Try to use GDELT location mentions as fallback, but mark as low confidence
    eventLocation = raw.locations[0]
    locationPrecision = 'unknown'
    locationConfidence = 0.2
  }

  const id = hashString(`${url}:${publishedAt}`)

  return {
    id,
    title,
    summary,
    url,
    source,
    sourceCountry,
    publishedAt,
    eventLocation,
    country,
    region,
    city,
    latitude,
    longitude,
    locationPrecision,
    locationConfidence,
    category,
    imageUrl,
    clusterId: null, // Set during clustering
    relatedSources: [url],
  }
}

/**
 * Simple similarity check for deduplication
 */
const calculateSimilarity = (a: string, b: string): number => {
  const aWords = a.toLowerCase().split(/\s+/)
  const bWords = b.toLowerCase().split(/\s+/)
  const setA = new Set(aWords)
  const setB = new Set(bWords)

  const intersection = [...setA].filter((word) => setB.has(word))
  const union = new Set([...setA, ...setB])

  if (union.size === 0) return 0
  return intersection.length / union.size
}

/**
 * Remove near-duplicate articles (same or very similar titles)
 */
export const deduplicateArticles = (
  articles: InternalArticle[],
): InternalArticle[] => {
  const unique: InternalArticle[] = []
  const seenTitles: string[] = []

  // Sort by publication date descending (newest first)
  const sorted = [...articles].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )

  for (const article of sorted) {
    const isDuplicate = seenTitles.some(
      (t) => calculateSimilarity(article.title, t) > 0.85,
    )

    if (!isDuplicate) {
      unique.push(article)
      seenTitles.push(article.title)
    }
  }

  return unique
}

/**
 * Group related articles into event clusters based on:
 * 1. Geographic proximity (same city/region)
 * 2. Temporal proximity (same day)
 * 3. Title similarity
 */
export const clusterEvents = (
  articles: InternalArray,
): InternalArray => {
  if (!articles || articles.length === 0) return articles

  const clustered = [...articles]
  let clusterCounter = 0
  const used = new Set<number>()

  for (let i = 0; i < clustered.length; i++) {
    if (used.has(i)) continue

    const clusterId = `cluster-${clusterCounter++}`
    clustered[i].clusterId = clusterId
    used.add(i)

    for (let j = i + 1; j < clustered.length; j++) {
      if (used.has(j)) continue

      const a = clustered[i]
      const b = clustered[j]

      // Same geographic area (city match or same coordinates)
      const sameLocation =
        (a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase()) ||
        (a.latitude !== null &&
          b.latitude !== null &&
          Math.abs(a.latitude - b.latitude) < 0.5 &&
          Math.abs(a.longitude! - b.longitude!) < 0.5)

      // Same day
      const sameDay =
        new Date(a.publishedAt).toDateString() ===
        new Date(b.publishedAt).toDateString()

      // Title similarity
      const similarTitle =
        calculateSimilarity(a.title, b.title) > 0.6

      if (sameLocation && sameDay && similarTitle) {
        clustered[j].clusterId = clusterId
        clustered[j].relatedSources = [
          ...new Set([...b.relatedSources, ...a.relatedSources]),
        ]
        used.add(j)
      }
    }
  }

  return clustered
}

// Type alias for convenience
type InternalArray = InternalArticle[]

export { InternalArray }

/**
 * Main normalization pipeline: fetch raw articles, geocode, normalize, dedup, cluster
 */
export const processNewsArticles = async (
  rawArticles: RawGdeltArticle[],
): Promise<InternalArticle[]> => {
  // Build geocoding queries for each article
  // Use GDELT location mentions first, then extract from title
  // Add source country as context for disambiguation (NOT as the event location itself)
  const geoQueries: string[] = []
  const queryToIndex: Map<string, number[]> = new Map()

  for (let i = 0; i < rawArticles.length; i++) {
    const raw = rawArticles[i]

    // Build a geocoding query from available location hints
    let locationQuery = ''

    // Prefer GDELT-extracted locations (these are actual place mentions in the article)
    if (raw.locations && raw.locations.length > 0) {
      locationQuery = raw.locations[0]
    } else {
      // Extract from title: take the first meaningful segment before separators
      const titlePart = raw.title
        .split(/[-|—]/)[0]
        .trim()
      // Skip if it's too short or looks like a non-location
      if (titlePart.length > 2) {
        locationQuery = titlePart
      }
    }

    // Add source country as context for disambiguation (not as the event location)
    if (
      locationQuery &&
      raw.sourcecountry &&
      raw.sourcecountry !== 'Unknown' &&
      !locationQuery.includes(raw.sourcecountry)
    ) {
      locationQuery = `${locationQuery}, ${raw.sourcecountry}`
    }

    if (locationQuery) {
      geoQueries.push(locationQuery)
      if (!queryToIndex.has(locationQuery)) {
        queryToIndex.set(locationQuery, [])
      }
      queryToIndex.get(locationQuery)!.push(i)
    }
  }

  // Geocode all unique queries (respecting rate limits via sequential processing)
  const geoResults: Map<string, GeocodeResult | null> = new Map()
  for (const query of geoQueries) {
    if (!geoResults.has(query)) {
      const result = await geocodeLocation(query)
      geoResults.set(query, result)
    }
  }

  // Normalize
  const normalized: InternalArticle[] = []
  for (let i = 0; i < rawArticles.length; i++) {
    const raw = rawArticles[i]

    // Find the geocoding query used for this article
    let locationQuery = ''
    if (raw.locations && raw.locations.length > 0) {
      locationQuery = raw.locations[0]
    } else {
      const titlePart = raw.title.split(/[-|—]/)[0].trim()
      if (titlePart.length > 2) {
        locationQuery = titlePart
      }
    }
    if (
      locationQuery &&
      raw.sourcecountry &&
      raw.sourcecountry !== 'Unknown' &&
      !locationQuery.includes(raw.sourcecountry)
    ) {
      locationQuery = `${locationQuery}, ${raw.sourcecountry}`
    }

    const geoResult = locationQuery ? geoResults.get(locationQuery) || null : null
    const article = await normalizeArticle(raw, geoResult)
    if (article) {
      normalized.push(article)
    }
  }

  // Deduplicate
  const deduped = deduplicateArticles(normalized)

  // Cluster
  const clustered = clusterEvents(deduped)

  // Sort by publication date descending
  clustered.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )

  return clustered
}

/**
 * Filter articles by viewport bounding box
 */
export const filterByViewport = (
  articles: InternalArticle[],
  bounds: {
    west: number
    south: number
    east: number
    north: number
  },
): InternalArticle[] => {
  return articles.filter((article) => {
    if (article.latitude === null || article.longitude === null) {
      return false
    }
    const { latitude, longitude } = article
    // Handle date line crossing
    if (bounds.west > bounds.east) {
      return (
        (latitude! >= bounds.south &&
          latitude! <= bounds.north &&
          (longitude! >= bounds.west || longitude! <= bounds.east)) ||
        false
      )
    }
    return (
      latitude! >= bounds.south &&
      latitude! <= bounds.north &&
      longitude! >= bounds.west &&
      longitude! <= bounds.east
    )
  })
}

/**
 * Filter articles by category
 */
export const filterByCategory = (
  articles: InternalArticle[],
  category: string | null,
): InternalArticle[] => {
  if (!category || category === 'all') return articles
  return articles.filter((a) => a.category === category)
}

/**
 * Filter articles by time range
 */
export const filterByTime = (
  articles: InternalArticle[],
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d',
): InternalArticle[] => {
  const now = Date.now()
  let ms: number

  switch (timeRange) {
    case '1h':
      ms = 60 * 60 * 1000
      break
    case '6h':
      ms = 6 * 60 * 60 * 1000
      break
    case '24h':
      ms = 24 * 60 * 60 * 1000
      break
    case '7d':
      ms = 7 * 24 * 60 * 60 * 1000
      break
    case '30d':
      ms = 30 * 24 * 60 * 60 * 1000
      break
    default:
      ms = 24 * 60 * 60 * 1000
  }

  const cutoff = now - ms
  return articles.filter((a) => new Date(a.publishedAt).getTime() >= cutoff)
}
