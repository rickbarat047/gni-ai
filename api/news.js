const { fetchGdeltNews, normalizeArticle, deduplicateArticles, clusterEvents, filterByCategory, filterByTime, corsHeaders } = require('./lib/news')

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  try {
    const query = req.query.query
    const timespan = req.query.timespan || '24h'
    const maxRecords = parseInt(req.query.maxRecords || '10', 10)
    const category = req.query.category
    const timeRange = req.query.timeRange

    const q = query || '(conflict OR politics OR economy OR disaster OR technology OR climate)'

    const rawArticles = await fetchGdeltNews(q, timespan, maxRecords)

    const processed = []
    let geoCount = 0
    const MAX_GEO = 0
    for (const raw of rawArticles) {
      const article = await normalizeArticle(raw, null, geoCount < MAX_GEO)
      if (article) processed.push(article)
      if (article && article.latitude !== null) geoCount++
    }

    const deduped = deduplicateArticles(processed)
    const clustered = clusterEvents(deduped)
    const filtered = filterByTime(filterByCategory(clustered, category), timeRange)
    const limited = filtered.slice(0, 100)

    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({
      success: true,
      cached: false,
      count: limited.length,
      total: filtered.length,
      data: limited,
      timestamp: new Date().toISOString(),
    }))
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'News fetch failed',
      timestamp: new Date().toISOString(),
    }))
  }
}
