/**
 * Shared helpers for Vercel serverless API functions.
 * Plain JavaScript to avoid TypeScript module resolution issues.
 */

const axios = require('axios')

const GDALT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc'
const GEOCODING_BASE = 'https://nominatim.openstreetmap.org/search'

let lastGdeltRequest = 0
let lastGeoRequest = 0

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const waitForGdelt = async () => {
  const now = Date.now()
  const elapsed = now - lastGdeltRequest
  if (elapsed < 1000) {
    await sleep(1000 - elapsed)
  }
  lastGdeltRequest = Date.now()
}

const waitForGeo = async () => {
  const now = Date.now()
  const elapsed = now - lastGeoRequest
  if (elapsed < 1100) {
    await sleep(1100 - elapsed)
  }
  lastGeoRequest = Date.now()
}

const gdeltClient = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'WORLDVIEW/1.0 (global-news-intelligence; contact@worldview.app)',
  },
})

const geoClient = axios.create({
  timeout: 20000,
  headers: {
    'User-Agent': 'WORLDVIEW/1.0 (https://worldview.app; contact@worldview.app)',
    'Accept-Language': 'en',
    Referer: 'https://worldview.app/',
  },
})

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

function classifyCategory(title, themes) {
  const text = `${title} ${(themes || []).join(' ')}`.toLowerCase()
  const keywords = {
    politics: ['politic', 'government', 'election', 'congress', 'parliament', 'president', 'minister', 'policy', 'senate', 'campaign'],
    conflict: ['war', 'conflict', 'attack', 'military', 'strike', 'invasion', 'bombing', 'troop', 'army', 'missile', 'combat'],
    business: ['economy', 'economic', 'business', 'market', 'stock', 'trade', 'finance', 'investment', 'gdp', 'inflation', 'company', 'corporate'],
    technology: ['technology', 'tech', 'ai', 'artificial intelligence', 'software', 'digital', 'internet', 'app', 'cyber', 'startup', 'silicon'],
    science: ['science', 'research', 'study', 'scientist', 'discovery', 'space', 'nasa', 'physics', 'biology', 'chemistry', 'astronomy'],
    climate: ['climate', 'environment', 'global warming', 'carbon', 'emission', 'greenhouse', 'renewable', 'sustainability', 'pollution', 'weather'],
    disaster: ['disaster', 'earthquake', 'hurricane', 'flood', 'wildfire', 'tsunami', 'volcano', 'storm', 'tornado', 'drought', 'landslide'],
    sports: ['sport', 'football', 'soccer', 'basketball', 'olympics', 'championship', 'league', 'tournament', 'match', 'game', 'player'],
    culture: ['entertainment', 'culture', 'movie', 'film', 'music', 'art', 'celebrity', 'festival', 'theater', 'literature', 'award'],
    health: ['health', 'medical', 'hospital', 'disease', 'virus', 'pandemic', 'vaccine', 'doctor', 'medicine', 'healthcare'],
  }

  const scores = {}
  for (const cat of Object.keys(keywords)) {
    scores[cat] = 0
    for (const kw of keywords[cat]) {
      if (text.includes(kw.toLowerCase())) scores[cat] += 1
    }
  }

  let best = 'politics'
  let bestScore = 0
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      best = cat
    }
  }
  return best
}

function parseGdeltDate(dateStr) {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d.toISOString()
  } catch {
    return null
  }
}

async function fetchGdeltNews(query, timespan, maxRecords, retries) {
  timespan = timespan || '24h'
  maxRecords = maxRecords || 100
  retries = retries || 3
  let lastError = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    await waitForGdelt()
    try {
      const response = await gdeltClient.get(GDALT_DOC_API, {
        params: {
          query,
          mode: 'artlist',
          format: 'json',
          maxrecords: Math.min(maxRecords, 250),
          timespan,
          sort: 'datelisted',
          overlap: 'off',
          image: 1,
          ssl: 1,
        },
      })
      return response.data?.articles || []
    } catch (error) {
      lastError = error
      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        if ((status === 429 || (status && status >= 500)) && attempt < retries) {
          const retryAfter = error.response?.headers?.['retry-after']
          const waitMs = retryAfter
            ? parseInt(String(retryAfter), 10) * 1000
            : Math.pow(2, attempt) * 1000
          await sleep(waitMs)
          continue
        }
        throw new Error(`GDELT API error: ${status || error.message}`)
      }
      throw new Error('GDELT API request failed')
    }
  }
  throw new Error(
    lastError instanceof Error ? lastError.message : 'GDELT API failed',
  )
}

async function geocodeLocation(query, retries) {
  retries = retries || 2
  let lastError = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    await waitForGeo()
    try {
      const response = await geoClient.get(GEOCODING_BASE, {
        params: { q: query, format: 'json', limit: 5, addressdetails: 1 },
      })
      const results = response.data
      if (!results || results.length === 0) return null
      const best = results[0]
      const address = best.address || {}
      const city = address.city || address.town || address.village || address.municipality || null
      const region = address.state || address.region || address.province || address.state_district || null
      const country = address.country || null
      const countryCode = address.country_code || null

      let precision = 'unknown'
      if (city) precision = 'city'
      else if (region) precision = 'region'
      else if (country) precision = 'country'

      let confidence = 0.5
      if (precision === 'city') confidence = 0.85
      else if (precision === 'region') confidence = 0.7
      else if (precision === 'country') confidence = 0.5
      else confidence = 0.3

      return {
        latitude: parseFloat(best.lat),
        longitude: parseFloat(best.lon),
        displayName: best.display_name,
        country,
        countryCode,
        region,
        city,
        precision,
        confidence,
      }
    } catch (error) {
      lastError = error
      if (attempt < retries) await sleep(1000 * (attempt + 1))
    }
  }
  return null
}

function calculateSimilarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/))
  const setB = new Set(b.toLowerCase().split(/\s+/))
  const intersection = [...setA].filter((w) => setB.has(w))
  const union = new Set([...setA, ...setB])
  return union.size === 0 ? 0 : intersection.length / union.size
}

function deduplicateArticles(articles) {
  const unique = []
  const seenTitles = []
  const sorted = [...articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )
  for (const article of sorted) {
    if (seenTitles.some((t) => calculateSimilarity(article.title, t) > 0.85)) {
      continue
    }
    unique.push(article)
    seenTitles.push(article.title)
  }
  return unique
}

function clusterEvents(articles) {
  if (!articles.length) return articles
  const clustered = [...articles]
  let counter = 0
  const used = new Set()
  for (let i = 0; i < clustered.length; i++) {
    if (used.has(i)) continue
    const clusterId = `cluster-${counter++}`
    clustered[i].clusterId = clusterId
    used.add(i)
    for (let j = i + 1; j < clustered.length; j++) {
      if (used.has(j)) continue
      const a = clustered[i]
      const b = clustered[j]
      const sameLocation =
        (a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase()) ||
        (a.latitude !== null &&
          b.latitude !== null &&
          Math.abs(a.latitude - b.latitude) < 0.5 &&
          Math.abs(a.longitude - b.longitude) < 0.5)
      const sameDay =
        new Date(a.publishedAt).toDateString() ===
        new Date(b.publishedAt).toDateString()
      const similarTitle = calculateSimilarity(a.title, b.title) > 0.6
      if (sameLocation && sameDay && similarTitle) {
        clustered[j].clusterId = clusterId
        used.add(j)
      }
    }
  }
  return clustered
}

function filterByViewport(articles, bounds) {
  return articles.filter((a) => {
    if (a.latitude === null || a.longitude === null) return false
    if (bounds.west > bounds.east) {
      return (
        a.latitude >= bounds.south &&
        a.latitude <= bounds.north &&
        (a.longitude >= bounds.west || a.longitude <= bounds.east)
      )
    }
    return (
      a.latitude >= bounds.south &&
      a.latitude <= bounds.north &&
      a.longitude >= bounds.west &&
      a.longitude <= bounds.east
    )
  })
}

function filterByCategory(articles, category) {
  if (!category || category === 'all') return articles
  return articles.filter((a) => a.category === category)
}

function filterByTime(articles, timeRange) {
  if (!timeRange) return articles
  const now = Date.now()
  let ms = 24 * 60 * 60 * 1000
  switch (timeRange) {
    case '1h': ms = 60 * 60 * 1000; break
    case '6h': ms = 6 * 60 * 60 * 1000; break
    case '24h': ms = 24 * 60 * 60 * 1000; break
    case '7d': ms = 7 * 24 * 60 * 60 * 1000; break
    case '30d': ms = 30 * 24 * 60 * 60 * 1000; break
  }
  const cutoff = now - ms
  return articles.filter((a) => new Date(a.publishedAt).getTime() >= cutoff)
}

async function normalizeArticle(raw, geo, shouldGeocode) {
  if (!raw.title || !raw.url) return null
  shouldGeocode = shouldGeocode !== false
  let geoResult = null
  if (shouldGeocode) {
    try {
      geoResult = await geocodeLocation(
        raw.locations && raw.locations.length > 0
          ? `${raw.locations[0]}, ${raw.sourcecountry}`
          : raw.title.split(/[-|—]/)[0].trim(),
      )
    } catch (e) {
      // Geocoding failed, continue without coordinates
    }
  }
  const lat = geoResult?.latitude ?? null
  const lon = geoResult?.longitude ?? null
  return {
    id: hashString(`${raw.url}:${raw.seendate}`),
    title: raw.title.trim(),
    summary: raw.title.trim(),
    url: raw.url.trim(),
    source: raw.domain || 'Unknown',
    sourceCountry: raw.sourcecountry || 'Unknown',
    publishedAt: parseGdeltDate(raw.seendate) || new Date().toISOString(),
    eventLocation: geoResult?.displayName || '',
    country: geoResult?.country || '',
    region: geoResult?.region || '',
    city: geoResult?.city || '',
    latitude: lat,
    longitude: lon,
    locationPrecision: geoResult?.precision ?? 'unknown',
    locationConfidence: geoResult?.confidence ?? 0,
    category: classifyCategory(raw.title, raw.themes),
    imageUrl: raw.socialimage || raw.image || null,
    clusterId: null,
    relatedSources: [raw.url],
  }
}

const CATEGORY_CONFIG = {
  politics: { id: 'politics', label: 'Politics', color: '#438BFF' },
  conflict: { id: 'conflict', label: 'Conflict / Security', color: '#FF4D4D' },
  business: { id: 'business', label: 'Business / Economy', color: '#4CAF50' },
  technology: { id: 'technology', label: 'Technology', color: '#40D9E8' },
  science: { id: 'science', label: 'Science', color: '#8B5CF6' },
  climate: { id: 'climate', label: 'Climate / Environment', color: '#14B8A6' },
  disaster: { id: 'disaster', label: 'Disasters', color: '#FB923C' },
  sports: { id: 'sports', label: 'Sports', color: '#EAB308' },
  culture: { id: 'culture', label: 'Culture', color: '#EC4899' },
  health: { id: 'health', label: 'Health', color: '#6366F1' },
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

module.exports = {
  fetchGdeltNews,
  normalizeArticle,
  deduplicateArticles,
  clusterEvents,
  filterByViewport,
  filterByCategory,
  filterByTime,
  geocodeLocation,
  CATEGORY_CONFIG,
  corsHeaders,
}
