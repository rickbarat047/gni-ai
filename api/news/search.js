const { fetchGdeltNews, normalizeArticle, deduplicateArticles, clusterEvents, corsHeaders } = require('../lib/news')

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  try {
    const query = req.query.q
    const timespan = req.query.timespan || '7d'
    const maxRecords = parseInt(req.query.maxRecords || '100', 10)

    if (!query) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
      res.end(JSON.stringify({ success: false, error: 'Missing query: q' }))
      return
    }

    const rawArticles = await fetchGdeltNews(query, timespan, maxRecords)
    const processed = []
    for (const raw of rawArticles) {
      const article = await normalizeArticle(raw, null)
      if (article) processed.push(article)
    }
    const deduped = deduplicateArticles(processed)
    const clustered = clusterEvents(deduped)

    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({
      success: true,
      cached: false,
      count: clustered.length,
      data: clustered,
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
