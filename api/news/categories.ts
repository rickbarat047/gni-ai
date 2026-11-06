import { VercelRequest, VercelResponse } from '@vercel/node'
import { CATEGORY_CONFIG, json, corsHeaders } from '../lib/news'

export default function handler(
  _req: VercelRequest,
  res: VercelResponse,
): void {
  if (_req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }
  const categories = Object.values(CATEGORY_CONFIG)
  res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
  res.end(JSON.stringify({ success: true, data: categories }))
}
