const { fetchNews, corsHeaders } = require('./lib/news')

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }))
    return
  }

  try {
    const result = await fetchNews({
      query: req.query.query,
      timespan: req.query.timespan || '24h',
      maxRecords: req.query.maxRecords || 150,
      category: req.query.category,
      timeRange: req.query.timeRange,
    })

    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({
      success: true,
      cached: result.cached,
      stale: result.stale,
      count: result.articles.length,
      total: result.total,
      data: result.articles,
      timestamp: new Date().toISOString(),
      warning: result.articles.length === 0
        ? 'No recent articles matched this request. Try a wider time range.'
        : undefined,
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
