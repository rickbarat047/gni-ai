const { corsHeaders, getCacheStats, getSourceHealth } = require('../lib/news')

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  const health = getSourceHealth()
  const cacheStats = getCacheStats()
  const cacheWarm = (cacheStats.size || 0) > 0

  res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
  res.end(JSON.stringify({
    success: true,
    timestamp: new Date().toISOString(),
    services: {
      news: {
        healthy: true,
        provider: 'multi-source RSS',
        configuredFeeds: health.configured,
        respondingFeeds: cacheWarm ? health.responding : null,
        failingFeeds: health.failing,
        cacheWarm,
        cacheAgeSeconds: cacheStats.ageSeconds,
      },
      geocoding: {
        healthy: true,
        provider: 'offline gazetteer + Nominatim',
      },
    },
    cache: {
      news: cacheStats,
    },
    config: {
      defaultTimespan: '24h',
      maxArticles: 250,
    },
  }))
}
