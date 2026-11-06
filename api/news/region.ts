import { VercelRequest, VercelResponse } from '@vercel/node'
import {
  fetchGdeltNews,
  normalizeArticle,
  deduplicateArticles,
  clusterEvents,
  filterByViewport,
  filterByCategory,
  filterByTime,
  json,
  corsHeaders,
  InternalArticle,
} from '../lib/news'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  try {
    const {
      west,
      south,
      east,
      north,
      timespan = '24h',
      maxRecords = '200',
      category,
      timeRange,
    } = req.query as Record<string, string | string[] | undefined>

    const w = Array.isArray(west) ? parseFloat(west[0]) : parseFloat(west)
    const s = Array.isArray(south) ? parseFloat(south[0]) : parseFloat(south)
    const e = Array.isArray(east) ? parseFloat(east[0]) : parseFloat(east)
    const n = Array.isArray(north) ? parseFloat(north[0]) : parseFloat(north)
    const ts = Array.isArray(timespan) ? timespan[0] : timespan
    const max = Array.isArray(maxRecords)
      ? parseInt(maxRecords[0], 10)
      : parseInt(maxRecords, 10)
    const cat = Array.isArray(category) ? category[0] : category
    const tr = Array.isArray(timeRange) ? timeRange[0] : timeRange

    if (isNaN(w) || isNaN(s) || isNaN(e) || isNaN(n)) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
      res.end(
        JSON.stringify({
          success: false,
          error: 'Missing bounding box parameters: west, south, east, north',
        }),
      )
      return
    }

    const rawArticles = await fetchGdeltNews(
      '(conflict OR politics OR economy OR disaster OR technology OR climate)',
      ts,
      max,
    )

    const processed: InternalArticle[] = []
    for (const raw of rawArticles) {
      const article = await normalizeArticle(raw, null)
      if (article) processed.push(article)
    }

    const deduped = deduplicateArticles(processed)
    const clustered = clusterEvents(deduped)
    const viewportFiltered = filterByViewport(clustered, { west: w, south: s, east: e, north: n })
    const filtered = filterByTime(filterByCategory(viewportFiltered, cat), tr)
    const limited = filtered.slice(0, 100)

    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(
      JSON.stringify({
        success: true,
        cached: false,
        count: limited.length,
        data: limited,
        timestamp: new Date().toISOString(),
      }),
    )
  } catch (error: unknown) {
    res.writeHead(502, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Region news failed',
        timestamp: new Date().toISOString(),
      }),
    )
  }
}
