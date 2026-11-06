import { VercelRequest, VercelResponse } from '@vercel/node'
import {
  fetchGdeltNews,
  normalizeArticle,
  deduplicateArticles,
  clusterEvents,
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
      query,
      timespan = '24h',
      maxRecords = '100',
      category,
      timeRange,
    } = req.query as Record<string, string | string[] | undefined>

    const q = Array.isArray(query) ? query[0] : query
    const ts = Array.isArray(timespan) ? timespan[0] : timespan
    const max = Array.isArray(maxRecords)
      ? parseInt(maxRecords[0], 10)
      : parseInt(maxRecords, 10)
    const cat = Array.isArray(category) ? category[0] : category
    const tr = Array.isArray(timeRange) ? timeRange[0] : timeRange

    const rawArticles = await fetchGdeltNews(q || '(conflict OR politics OR economy OR disaster OR technology OR climate)', ts, max)

    const processed: InternalArticle[] = []
    for (const raw of rawArticles) {
      const article = await normalizeArticle(raw, null)
      if (article) processed.push(article)
    }

    const deduped = deduplicateArticles(processed)
    const clustered = clusterEvents(deduped)
    const filtered = filterByTime(filterByCategory(clustered, cat), tr)
    const limited = filtered.slice(0, 100)

    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(
      JSON.stringify({
        success: true,
        cached: false,
        count: limited.length,
        total: filtered.length,
        data: limited,
        timestamp: new Date().toISOString(),
      }),
    )
  } catch (error: unknown) {
    res.writeHead(502, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'News fetch failed',
        timestamp: new Date().toISOString(),
      }),
    )
  }
}
