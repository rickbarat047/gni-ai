const { fetchGdeltNews, normalizeArticle, deduplicateArticles, clusterEvents, filterByViewport, filterByCategory, filterByTime, corsHeaders } = require('../lib/news')

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  try {
    const west = parseFloat(req.query.west)
    const south = parseFloat(req.query.south)
    const east = parseFloat(req.query.east)
    const north = parseFloat(req.query.north)
    const timespan = req.query.timespan || '24h'
    const maxRecords = parseInt(req.query.maxRecords || '200', 10)
    const category = req.query.category
    const timeRange = req.query.timeRange

    if (isNaN(west) || isNaN(south) || isNaN(east) || isNaN(north)) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
      res.end(JSON.stringify({ success: false, error: 'Missing bounding box parameters: west, south, east, north' }))
      return
    }

    const rawArticles = await fetchGdeltNews('(conflict OR politics OR economy OR disaster OR technology OR climate)', timespan, maxRecords)

    const processed = []
    for (const raw of rawArticles) {
      const article = await normalizeArticle(raw, null)
      if (article) processed.push(article)
    }

    const deduped = deduplicateArticles(processed)
    const clustered = clusterEvents(deduped)
    const viewportFiltered = filterByViewport(clustered, { west, south, east, north })
    const filtered = filterByTime(filterByCategory(viewportFiltered, category), timeRange)
    const limited = filtered.slice(0, 100)

    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({
      success: true,
      cached: false,
      count: limited.length,
      data: limited,
      timestamp: new Date().toISOString(),
    }))
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Region news failed',
      timestamp: new Date().toISOString(),
    }))
  }
}
