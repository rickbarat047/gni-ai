import { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchGdeltNews, normalizeArticle, deduplicateArticles, clusterEvents, json, corsHeaders, InternalArticle } from '../lib/news'

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
    const { q, timespan = '7d', maxRecords = '100' } =
      req.query as Record<string, string | string[] | undefined>

    const query = Array.isArray(q) ? q[0] : q
    const ts = Array.isArray(timespan) ? timespan[0] : timespan
    const max = Array.isArray(maxRecords)
      ? parseInt(maxRecords[0], 10)
      : parseInt(maxRecords, 10)

    if (!query) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
      res.end(JSON.stringify({ success: false, error: 'Missing query: q' }))
      return
    }

    const rawArticles = await fetchGdeltNews(query, ts, max)
    const processed: InternalArticle[] = []
    for (const raw of rawArticles) {
      const article = await normalizeArticle(raw, null)
      if (article) processed.push(article)
    }
    const deduped = deduplicateArticles(processed)
    const clustered = clusterEvents(deduped)

    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(
      JSON.stringify({
        success: true,
        cached: false,
        count: clustered.length,
        data: clustered,
        timestamp: new Date().toISOString(),
      }),
    )
  } catch (error: unknown) {
    res.writeHead(502, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
        timestamp: new Date().toISOString(),
      }),
    )
  }
}
