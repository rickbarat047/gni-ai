const { fetchNews, corsHeaders } = require('../lib/news')

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  try {
    const query = req.query.q
    const timespan = req.query.timespan || '7d'
    const maxRecords = req.query.maxRecords || 200

    if (!query) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
      res.end(JSON.stringify({ success: false, error: 'Missing query: q' }))
      return
    }

    const result = await fetchNews({ query, timespan, maxRecords })

    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({
      success: true,
      cached: result.cached,
      stale: result.stale,
      count: result.articles.length,
      total: result.total,
      data: result.articles,
      timestamp: new Date().toISOString(),
    }))
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
      timestamp: new Date().toISOString(),
    }))
  }
}
