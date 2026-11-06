import { VercelRequest, VercelResponse } from '@vercel/node'
import { json, corsHeaders } from '../lib/news'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  const { lat, lon } = req.query as Record<string, string | string[] | undefined>
  const latitude = Array.isArray(lat) ? parseFloat(lat[0]) : parseFloat(lat)
  const longitude = Array.isArray(lon) ? parseFloat(lon[0]) : parseFloat(lon)

  if (isNaN(latitude) || isNaN(longitude)) {
    res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({ success: false, error: 'Missing lat, lon' }))
    return
  }

  // Reverse geocode via Nominatim
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
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
      city:
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        null,
    }
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({ success: true, data: result }))
  } catch (error: unknown) {
    res.writeHead(502, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Reverse geocode failed',
      }),
    )
  }
}
