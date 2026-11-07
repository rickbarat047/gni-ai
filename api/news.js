export const config = { runtime: 'edge' }

const GDALT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc'

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

function deduplicateArticles(articles) {
  const unique = []
  const seenTitles = []
  const sorted = [...articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )
  for (const article of sorted) {
    const setA = new Set(article.title.toLowerCase().split(/\s+/))
    const isDuplicate = seenTitles.some((t) => {
      const setB = new Set(t.toLowerCase().split(/\s+/))
      const intersection = [...setA].filter((w) => setB.has(w))
      const union = new Set([...setA, ...setB])
      return union.size === 0 ? false : intersection.length / union.size > 0.85
    })
    if (!isDuplicate) {
      unique.push(article)
      seenTitles.push(article.title)
    }
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
        (a.latitude !== null && b.latitude !== null &&
          Math.abs(a.latitude - b.latitude) < 0.5 &&
          Math.abs(a.longitude - b.longitude) < 0.5)
      const sameDay =
        new Date(a.publishedAt).toDateString() === new Date(b.publishedAt).toDateString()
      const setA = new Set(a.title.toLowerCase().split(/\s+/))
      const setB = new Set(b.title.toLowerCase().split(/\s+/))
      const intersection = [...setA].filter((w) => setB.has(w))
      const union = new Set([...setA, ...setB])
      const similarTitle = union.size === 0 ? false : intersection.length / union.size > 0.6
      if (sameLocation && sameDay && similarTitle) {
        clustered[j].clusterId = clusterId
        used.add(j)
      }
    }
  }
  return clustered
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

export default async function handler(req) {
  const url = new URL(req.url)
  const query = url.searchParams.get('query') || '(conflict OR politics OR economy OR disaster OR technology OR climate)'
  const timespan = url.searchParams.get('timespan') || '24h'
  const maxRecords = parseInt(url.searchParams.get('maxRecords') || '10', 10)
  const category = url.searchParams.get('category')
  const timeRange = url.searchParams.get('timeRange')

  try {
    const gdeltUrl = `${GDALT_DOC_API}?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=${Math.min(maxRecords, 250)}&timespan=${timespan}&sort=datelisted&overlap=off&image=1&ssl=1`
    const response = await fetch(gdeltUrl, {
      headers: { 'User-Agent': 'WORLDVIEW/1.0 (global-news-intelligence; contact@worldview.app)' },
    })
    const data = await response.json()
    const rawArticles = data?.articles || []

    const processed = []
    for (const raw of rawArticles) {
      if (!raw.title || !raw.url) continue
      processed.push({
        id: hashString(`${raw.url}:${raw.seendate}`),
        title: raw.title.trim(),
        summary: raw.title.trim(),
        url: raw.url.trim(),
        source: raw.domain || 'Unknown',
        sourceCountry: raw.sourcecountry || 'Unknown',
        publishedAt: parseGdeltDate(raw.seendate) || new Date().toISOString(),
        eventLocation: '',
        country: '',
        region: '',
        city: '',
        latitude: null,
        longitude: null,
        locationPrecision: 'unknown',
        locationConfidence: 0,
        category: classifyCategory(raw.title, raw.themes),
        imageUrl: raw.socialimage || raw.image || null,
        clusterId: null,
        relatedSources: [raw.url],
      })
    }

    const deduped = deduplicateArticles(processed)
    const clustered = clusterEvents(deduped)
    const filtered = filterByTime(filterByCategory(clustered, category), timeRange)
    const limited = filtered.slice(0, 100)

    return new Response(JSON.stringify({
      success: true,
      cached: false,
      count: limited.length,
      total: filtered.length,
      data: limited,
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'News fetch failed',
      timestamp: new Date().toISOString(),
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }
}
