const { corsHeaders } = require('../lib/news')

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  const lat = parseFloat(req.query.lat)
  const lon = parseFloat(req.query.lon)

  if (isNaN(lat) || isNaN(lon)) {
    res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({ success: false, error: 'Missing lat, lon' }))
    return
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'WORLDVIEW/1.0 (https://worldview.app; contact@worldview.app)',
          'Accept-Language': 'en',
        },
      },
    )
    const data = await response.json()
    const address = data.address || {}
    const result = {
      displayName: data.display_name,
      country: address.country || null,
      countryCode: address.country_code || null,
      region: address.state || address.region || address.province || null,
      city: address.city || address.town || address.village || address.municipality || null,
    }
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({ success: true, data: result }))
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Reverse geocode failed',
    }))
  }
}
