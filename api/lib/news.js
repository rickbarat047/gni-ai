/**
 * Shared news pipeline for the Vercel API functions.
 *
 * Sources: 29 public RSS feeds (see ./feeds.js)
 * Geocoding: offline gazetteer (see ./gazetteer.js), Nominatim only on demand
 *
 * Everything is plain CommonJS so it runs unchanged in Vercel's Node runtime.
 */

const { FEEDS, fetchAllFeedArticles } = require('./feeds')
const { extractLocation } = require('./gazetteer')

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'

const CACHE_TTL_MS = 4 * 60 * 1000
const STALE_TTL_MS = 30 * 60 * 1000

let cache = {
  articles: null,
  sources: null,
  fetchedAt: 0,
}
let inflight = null
let cacheHits = 0
let cacheMisses = 0

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/* ------------------------------------------------------------------ */
/* Categorisation                                                      */
/* ------------------------------------------------------------------ */

const KEYWORDS = {
  conflict: ['war', 'conflict', 'attack', 'military', 'airstrike', 'air strike', 'invasion', 'bomb', 'troop', 'army', 'missile', 'combat', 'drone', 'ceasefire', 'militant', 'insurgent', 'shelling', 'offensive', 'hostage', 'terror'],
  disaster: ['disaster', 'earthquake', 'hurricane', 'flood', 'wildfire', 'tsunami', 'volcano', 'storm', 'tornado', 'drought', 'landslide', 'cyclone', 'eruption', 'quake', 'blaze', 'rescue'],
  politics: ['politic', 'government', 'election', 'congress', 'parliament', 'president', 'minister', 'policy', 'senate', 'campaign', 'vote', 'diplomat', 'sanction', 'summit', 'treaty', 'premier', 'chancellor', 'coalition', 'referendum'],
  business: ['economy', 'economic', 'business', 'market', 'stock', 'trade', 'finance', 'investment', 'gdp', 'inflation', 'company', 'corporate', 'tariff', 'bank', 'currency', 'oil price', 'recession', 'profit', 'earnings', 'ipo'],
  technology: ['technology', 'tech', 'artificial intelligence', 'software', 'digital', 'internet', 'cyber', 'startup', 'silicon', 'semiconductor', 'chip', 'robot', 'data breach', 'hacker', 'algorithm', 'quantum'],
  science: ['science', 'research', 'study', 'scientist', 'discovery', 'space', 'nasa', 'physics', 'biology', 'chemistry', 'astronomy', 'rocket', 'satellite', 'climate study', 'genome'],
  climate: ['climate', 'environment', 'global warming', 'carbon', 'emission', 'greenhouse', 'renewable', 'sustainability', 'pollution', 'biodiversity', 'deforestation', 'net zero', 'fossil fuel'],
  health: ['health', 'medical', 'hospital', 'disease', 'virus', 'pandemic', 'vaccine', 'doctor', 'medicine', 'healthcare', 'outbreak', 'cancer', 'who warns', 'mental health'],
  sports: ['sport', 'football', 'soccer', 'basketball', 'olympics', 'championship', 'league', 'tournament', 'match', 'player', 'cricket', 'tennis', 'rugby', 'formula 1', 'world cup'],
  culture: ['entertainment', 'culture', 'movie', 'film', 'music', 'art', 'celebrity', 'festival', 'theatre', 'theater', 'literature', 'award', 'album', 'box office', 'netflix'],
}

function classifyCategory(title, extra) {
  const text = `${title || ''} ${extra || ''}`.toLowerCase()

  let best = 'politics'
  let bestScore = 0

  for (const [category, words] of Object.entries(KEYWORDS)) {
    let score = 0
    for (const word of words) {
      if (text.includes(word)) {
        // A hit in the headline is worth more than one in the description.
        score += (title || '').toLowerCase().includes(word) ? 2 : 1
      }
    }
    if (score > bestScore) {
      bestScore = score
      best = category
    }
  }

  return best
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

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

function normalizeTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function calculateSimilarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/))
  const setB = new Set(b.toLowerCase().split(/\s+/))
  const intersection = [...setA].filter((word) => setB.has(word))
  const union = new Set([...setA, ...setB])
  return union.size === 0 ? 0 : intersection.length / union.size
}

function parseTimespan(timespan) {
  const value = String(timespan || '24h').toLowerCase()
  const match = value.match(/^(\d+)\s*([mhd])$/)
  if (!match) return 24 * 60 * 60 * 1000
  const amount = parseInt(match[1], 10)
  const unit = match[2]
  if (unit === 'm') return amount * 60 * 1000
  if (unit === 'h') return amount * 60 * 60 * 1000
  return amount * 24 * 60 * 60 * 1000
}

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

function normalizeArticle(raw) {
  if (!raw || !raw.title || !raw.url) return null

  const location = extractLocation(raw.title, raw.description)
  const summary = (raw.description || raw.title || '').trim()

  return {
    id: hashString(`${raw.url}:${raw.publishedAt}`),
    title: raw.title.trim(),
    summary: summary.slice(0, 600),
    url: raw.url.trim(),
    source: raw.source || 'Unknown',
    sourceCountry: raw.sourceCountry || 'Unknown',
    publishedAt: raw.publishedAt || new Date().toISOString(),
    eventLocation: location ? location.eventLocation : '',
    country: location ? location.country : '',
    region: location ? location.region : '',
    city: location ? location.city : '',
    latitude: location ? location.latitude : null,
    longitude: location ? location.longitude : null,
    locationPrecision: location ? location.precision : 'unknown',
    locationConfidence: location ? location.confidence : 0,
    category: classifyCategory(raw.title, raw.description),
    imageUrl: raw.imageUrl || null,
    clusterId: null,
    relatedSources: [raw.url],
  }
}

function deduplicateArticles(articles) {
  const sorted = [...articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )

  const unique = []
  const normalizedTitles = []

  for (const article of sorted) {
    const normalized = normalizeTitle(article.title)
    let duplicateIndex = -1

    for (let i = 0; i < normalizedTitles.length; i++) {
      if (normalized === normalizedTitles[i]) {
        duplicateIndex = i
        break
      }
    }

    if (duplicateIndex === -1) {
      for (let i = 0; i < normalizedTitles.length; i++) {
        if (calculateSimilarity(normalized, normalizedTitles[i]) > 0.85) {
          duplicateIndex = i
          break
        }
      }
    }

    if (duplicateIndex >= 0) {
      const existing = unique[duplicateIndex]
      if (
        article.url !== existing.url &&
        existing.relatedSources.length < 6 &&
        !existing.relatedSources.includes(article.url)
      ) {
        existing.relatedSources.push(article.url)
      }
      continue
    }

    unique.push(article)
    normalizedTitles.push(normalized)
  }

  return unique
}

function clusterEvents(articles) {
  if (!articles.length) return articles

  let counter = 0
  const used = new Set()

  for (let i = 0; i < articles.length; i++) {
    if (used.has(i)) continue
    const clusterId = `cluster-${counter++}`
    articles[i].clusterId = clusterId
    used.add(i)

    for (let j = i + 1; j < articles.length; j++) {
      if (used.has(j)) continue
      const a = articles[i]
      const b = articles[j]

      const sameLocation =
        (a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase()) ||
        (a.country && b.country && a.country.toLowerCase() === b.country.toLowerCase()) ||
        (a.latitude !== null &&
          b.latitude !== null &&
          Math.abs(a.latitude - b.latitude) < 0.5 &&
          Math.abs(a.longitude - b.longitude) < 0.5)

      const sameDay =
        new Date(a.publishedAt).toDateString() === new Date(b.publishedAt).toDateString()

      if (sameLocation && sameDay && calculateSimilarity(a.title, b.title) > 0.6) {
        articles[j].clusterId = clusterId
        used.add(j)
      }
    }
  }

  return articles
}

function filterByViewport(articles, bounds) {
  return articles.filter((article) => {
    if (article.latitude === null || article.longitude === null) return false
    if (bounds.west > bounds.east) {
      return (
        article.latitude >= bounds.south &&
        article.latitude <= bounds.north &&
        (article.longitude >= bounds.west || article.longitude <= bounds.east)
      )
    }
    return (
      article.latitude >= bounds.south &&
      article.latitude <= bounds.north &&
      article.longitude >= bounds.west &&
      article.longitude <= bounds.east
    )
  })
}

function filterByCategory(articles, category) {
  if (!category || category === 'all') return articles
  return articles.filter((article) => article.category === category)
}

function filterByTime(articles, timeRange) {
  if (!timeRange) return articles
  const ms = parseTimespan(timeRange)
  const cutoff = Date.now() - ms
  return articles.filter((article) => new Date(article.publishedAt).getTime() >= cutoff)
}

function filterByQuery(articles, query) {
  if (!query || !String(query).trim()) return articles

  const terms = String(query)
    .replace(/[()"]/g, ' ')
    .split(/\s+OR\s+|\s+AND\s+|\s+/i)
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 2 && !['the', 'and', 'or', 'news'].includes(term))

  if (!terms.length) return articles

  return articles
    .map((article) => {
      const haystack = `${article.title} ${article.summary}`.toLowerCase()
      const score = terms.reduce(
        (total, term) => total + (haystack.includes(term) ? 1 : 0),
        0,
      )
      return { article, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.article.publishedAt) - new Date(a.article.publishedAt))
    .map((entry) => entry.article)
}

/* ------------------------------------------------------------------ */
/* Feed loading + in-memory cache                                      */
/* ------------------------------------------------------------------ */

async function loadArticles() {
  const now = Date.now()

  if (cache.articles && now - cache.fetchedAt < CACHE_TTL_MS) {
    cacheHits++
    return {
      articles: cache.articles,
      sources: cache.sources,
      cached: true,
      stale: false,
    }
  }

  if (inflight) return inflight

  cacheMisses++

  inflight = (async () => {
    try {
      const { articles: rawArticles, sources } = await fetchAllFeedArticles()
      const normalized = rawArticles.map(normalizeArticle).filter(Boolean)
      const deduped = deduplicateArticles(normalized)
      const clustered = clusterEvents(deduped)

      if (clustered.length > 0) {
        cache = {
          articles: clustered,
          sources,
          fetchedAt: Date.now(),
        }
        return { articles: clustered, sources, cached: false, stale: false }
      }

      if (cache.articles && Date.now() - cache.fetchedAt < STALE_TTL_MS) {
        return { articles: cache.articles, sources: cache.sources, cached: true, stale: true }
      }

      return { articles: [], sources, cached: false, stale: false }
    } catch (error) {
      if (cache.articles && Date.now() - cache.fetchedAt < STALE_TTL_MS) {
        return { articles: cache.articles, sources: cache.sources, cached: true, stale: true }
      }
      throw error
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/**
 * Main entry used by the endpoints.
 */
async function fetchNews(options = {}) {
  const result = await loadArticles()

  let articles = result.articles

  if (options.query) articles = filterByQuery(articles, options.query)
  if (options.category) articles = filterByCategory(articles, options.category)
  if (options.timeRange) articles = filterByTime(articles, options.timeRange)

  if (options.timespan && !options.timeRange) {
    articles = filterByTime(articles, options.timespan)
  }

  const total = articles.length
  const limit = Math.max(1, Math.min(parseInt(options.maxRecords, 10) || 150, 250))

  return {
    articles: articles.slice(0, limit),
    total,
    cached: result.cached,
    stale: result.stale,
    sources: result.sources || [],
  }
}

// Backwards-compatible alias for older call sites.
const fetchGdeltNews = fetchNews

function getCacheStats() {
  return {
    hits: cacheHits,
    misses: cacheMisses,
    size: cache.articles ? cache.articles.length : 0,
    ageSeconds: cache.fetchedAt ? Math.round((Date.now() - cache.fetchedAt) / 1000) : null,
  }
}

function getSourceHealth() {
  const sources = cache.sources || []
  return {
    configured: FEEDS.length,
    responding: sources.filter((source) => source.count > 0).length,
    failing: sources.filter((source) => source.error).map((source) => ({
      id: source.id,
      error: source.error,
    })),
  }
}

/* ------------------------------------------------------------------ */
/* On-demand geocoding (Nominatim)                                     */
/* ------------------------------------------------------------------ */

async function geocodeLocation(query, retries = 1) {
  if (!query || !String(query).trim()) return null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 7000)
    try {
      const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'WorldView/1.0 (global news intelligence; https://gni-ai-snowy.vercel.app)',
          'Accept-Language': 'en',
        },
      })

      if (!response.ok) {
        if (attempt < retries && response.status >= 500) {
          await sleep(800)
          continue
        }
        return null
      }

      const results = await response.json()
      if (!results || !results.length) return null

      const best = results[0]
      const address = best.address || {}
      const city =
        address.city || address.town || address.village || address.municipality || null
      const region =
        address.state || address.region || address.province || address.state_district || null
      const country = address.country || null
      const countryCode = address.country_code || null

      let precision = 'unknown'
      if (city) precision = 'city'
      else if (region) precision = 'region'
      else if (country) precision = 'country'

      const confidence =
        precision === 'city' ? 0.85 : precision === 'region' ? 0.7 : precision === 'country' ? 0.5 : 0.3

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
    } catch {
      if (attempt < retries) {
        await sleep(800)
        continue
      }
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  return null
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=60, s-maxage=120',
}

module.exports = {
  // data
  fetchNews,
  fetchGdeltNews,
  normalizeArticle,
  deduplicateArticles,
  clusterEvents,
  filterByViewport,
  filterByCategory,
  filterByTime,
  filterByQuery,
  classifyCategory,
  geocodeLocation,
  parseTimespan,
  getCacheStats,
  getSourceHealth,
  CATEGORY_CONFIG,
  corsHeaders,
}
