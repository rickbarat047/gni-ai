const { corsHeaders } = require('../lib/news')

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }
  res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
  res.end(JSON.stringify({
    success: true,
    timestamp: new Date().toISOString(),
    services: {
      gdelt: {
        healthy: true,
        error: null,
        endpoint: 'https://api.gdeltproject.org/api/v2/doc/doc',
      },
      geocoding: {
        healthy: true,
        endpoint: 'https://nominatim.openstreetmap.org/search',
      },
    },
    cache: { news: { hits: 0, misses: 0 }, geocoding: { hits: 0, misses: 0 } },
    config: { defaultTimespan: '24h', maxArticles: 100 },
  }))
}
