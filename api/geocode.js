const { geocodeLocation, corsHeaders } = require('../lib/news')

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  const query = req.query.q

  if (!query) {
    res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({ success: false, error: 'Missing query: q' }))
    return
  }

  try {
    const result = await geocodeLocation(query)
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({
      success: true,
      data: result,
      message: result ? undefined : 'No geocoding results found',
    }))
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Geocoding failed',
    }))
  }
}
