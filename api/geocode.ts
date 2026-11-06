import { VercelRequest, VercelResponse } from '@vercel/node'
import { geocodeLocation, json, corsHeaders } from '../lib/news'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  const { q } = req.query as Record<string, string | string[] | undefined>
  const query = Array.isArray(q) ? q[0] : q

  if (!query) {
    res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({ success: false, error: 'Missing query: q' }))
    return
  }

  try {
    const result = await geocodeLocation(query)
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(
      JSON.stringify({
        success: true,
        data: result,
        message: result ? undefined : 'No geocoding results found',
      }),
    )
  } catch (error: unknown) {
    res.writeHead(502, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Geocoding failed',
      }),
    )
  }
}
