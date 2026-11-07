const {
  fetchNews,
  filterByViewport,
  corsHeaders,
} = require('../lib/news')

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

    if (isNaN(west) || isNaN(south) || isNaN(east) || isNaN(north)) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
      res.end(JSON.stringify({
        success: false,
        error: 'Missing bounding box parameters: west, south, east, north',
      }))
      return
    }

    const result = await fetchNews({
      timespan: req.query.timespan || '7d',
      maxRecords: req.query.maxRecords || 250,
      category: req.query.category,
      timeRange: req.query.timeRange,
    })

    const inViewport = filterByViewport(result.articles, { west, south, east, north })
    const limited = inViewport.slice(0, 250)

    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({
      success: true,
      cached: result.cached,
      stale: result.stale,
      count: limited.length,
      total: inViewport.length,
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
