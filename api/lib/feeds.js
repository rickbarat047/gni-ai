/**
 * Multi-source RSS ingestion.
 *
 * GDELT's DOC API is frequently rate-limited (HTTP 429) and can take 10-30s,
 * which does not fit inside a Vercel serverless request. These public RSS
 * feeds respond in a few hundred milliseconds and give us a genuinely global
 * mix of publishers.
 */

const FEEDS = [
  { id: 'bbc-world', source: 'BBC News', country: 'United Kingdom', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'bbc-top', source: 'BBC News', country: 'United Kingdom', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { id: 'aljazeera', source: 'Al Jazeera', country: 'Qatar', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { id: 'guardian-world', source: 'The Guardian', country: 'United Kingdom', url: 'https://www.theguardian.com/world/rss' },
  { id: 'guardian-uk', source: 'The Guardian', country: 'United Kingdom', url: 'https://www.theguardian.com/uk/rss' },
  { id: 'guardian-us', source: 'The Guardian', country: 'United Kingdom', url: 'https://www.theguardian.com/us/rss' },
  { id: 'npr-world', source: 'NPR', country: 'United States', url: 'https://feeds.npr.org/1004/rss.xml' },
  { id: 'npr-top', source: 'NPR', country: 'United States', url: 'https://feeds.npr.org/1001/rss.xml' },
  { id: 'nyt-world', source: 'The New York Times', country: 'United States', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
  { id: 'cnbc-world', source: 'CNBC', country: 'United States', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362' },
  { id: 'sky-world', source: 'Sky News', country: 'United Kingdom', url: 'https://feeds.skynews.com/feeds/rss/world.xml' },
  { id: 'france24', source: 'France 24', country: 'France', url: 'https://www.france24.com/en/rss' },
  { id: 'dw-world', source: 'DW', country: 'Germany', url: 'https://rss.dw.com/rdf/rss-en-world' },
  { id: 'euronews', source: 'Euronews', country: 'France', url: 'https://www.euronews.com/rss?level=theme&name=news' },
  { id: 'politico-eu', source: 'Politico Europe', country: 'Belgium', url: 'https://www.politico.eu/feed/' },
  { id: 'times-of-israel', source: 'The Times of Israel', country: 'Israel', url: 'https://www.timesofisrael.com/feed/' },
  { id: 'dailysabah', source: 'Daily Sabah', country: 'Turkey', url: 'https://www.dailysabah.com/rss/world' },
  { id: 'iran-intl', source: 'Iran International', country: 'Iran', url: 'https://www.iranintl.com/en/rss' },
  { id: 'mehr-news', source: 'Mehr News', country: 'Iran', url: 'https://en.mehrnews.com/rss' },
  { id: 'moscow-times', source: 'The Moscow Times', country: 'Russia', url: 'https://www.themoscowtimes.com/rss/news' },
  { id: 'africanews', source: 'Africanews', country: 'Kenya', url: 'https://www.africanews.com/feed/rss' },
  { id: 'times-of-india', source: 'The Times of India', country: 'India', url: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms' },
  { id: 'the-diplomat', source: 'The Diplomat', country: 'United States', url: 'https://thediplomat.com/feed/' },
  { id: 'cna-asia', source: 'CNA', country: 'Singapore', url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml' },
  { id: 'japan-times', source: 'The Japan Times', country: 'Japan', url: 'https://www.japantimes.co.jp/feed/' },
  { id: 'abc-australia', source: 'ABC News', country: 'Australia', url: 'https://www.abc.net.au/news/feed/51120/rss.xml' },
  { id: 'un-news', source: 'UN News', country: 'United States', url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml' },
  { id: 'scmp', source: 'South China Morning Post', country: 'Hong Kong', url: 'https://www.scmp.com/rss/91/feed' },
]

const MAX_ITEMS_PER_FEED = 12
const FETCH_TIMEOUT_MS = 4000

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  times: '×',
}

function decodeEntities(value) {
  if (!value) return ''
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, code) => {
    if (code[0] === '#') {
      const hex = code[1] === 'x' || code[1] === 'X'
      const num = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10)
      if (!Number.isFinite(num)) return whole
      try {
        return String.fromCodePoint(num)
      } catch {
        return whole
      }
    }
    const named = ENTITIES[code.toLowerCase()]
    return named === undefined ? whole : named
  })
}

function unwrapCdata(value) {
  if (!value) return ''
  let out = value.trim()
  const cdata = out.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
  if (cdata) out = cdata[1]
  return out.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

function stripHtml(value) {
  if (!value) return ''
  const decoded = decodeEntities(unwrapCdata(value))
  return decodeEntities(
    decoded
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  ).trim()
}

function tagContent(xml, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(
      `<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`,
      'i',
    )
    const match = xml.match(pattern)
    if (match && match[1] && match[1].trim()) return match[1]
  }
  return ''
}

function attrContent(xml, tagName, attrName) {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedAttr = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `<${escapedTag}[^>]*\\s${escapedAttr}=["']([^"']+)["']`,
    'i',
  )
  const match = xml.match(pattern)
  return match ? match[1] : ''
}

function firstImageUrl(itemXml, html) {
  const media =
    attrContent(itemXml, 'media:content', 'url') ||
    attrContent(itemXml, 'media:thumbnail', 'url')
  if (media) return decodeEntities(media).trim()

  const enclosure = itemXml.match(/<enclosure[^>]*>/i)
  if (enclosure) {
    const url = attrContent(enclosure[0], 'enclosure', 'url')
    if (url && /\.(jpe?g|png|webp|gif|avif)/i.test(url)) return decodeEntities(url).trim()
  }

  const img = (html || '').match(/<img[^>]+src=["']([^"']+)["']/i)
  if (img) return decodeEntities(img[1]).trim()

  return null
}

function parseDate(value) {
  if (!value) return null
  const cleaned = stripHtml(value)
  if (!cleaned) return null
  const date = new Date(cleaned)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function parseFeed(xml, feed) {
  const blocks = []
  const itemPattern = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemPattern.exec(xml)) !== null) {
    blocks.push(match[1])
  }
  if (!blocks.length) {
    const entryPattern = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi
    while ((match = entryPattern.exec(xml)) !== null) {
      blocks.push(match[1])
    }
  }

  const articles = []
  for (const block of blocks.slice(0, MAX_ITEMS_PER_FEED * 2)) {
    const title = stripHtml(tagContent(block, ['title']))
    if (!title) continue

    let link = stripHtml(tagContent(block, ['link']))
    if (!link) {
      const href = attrContent(block, 'link', 'href')
      if (href) link = decodeEntities(href)
    }
    if (!link || !/^https?:\/\//i.test(link)) continue

    const description = stripHtml(
      tagContent(block, ['description', 'summary', 'content:encoded', 'content']),
    ).slice(0, 900)

    const published =
      parseDate(
        tagContent(block, [
          'pubDate',
          'dc:date',
          'published',
          'updated',
          'lastBuildDate',
        ]),
      ) || new Date().toISOString()

    articles.push({
      title: title.slice(0, 400),
      description,
      url: link.trim(),
      imageUrl: firstImageUrl(block, tagContent(block, ['description', 'content:encoded'])),
      publishedAt: published,
      source: feed.source,
      sourceCountry: feed.country,
      feedId: feed.id,
    })

    if (articles.length >= MAX_ITEMS_PER_FEED) break
  }

  return articles
}

async function fetchFeed(feed) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(feed.url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; WorldView/1.0; +https://gni-ai-snowy.vercel.app)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en',
      },
    })
    if (!response.ok) {
      return { feed, articles: [], error: `HTTP ${response.status}` }
    }
    const xml = await response.text()
    if (!xml || xml.length < 200) {
      return { feed, articles: [], error: 'Empty feed' }
    }
    return { feed, articles: parseFeed(xml, feed), error: null }
  } catch (error) {
    return {
      feed,
      articles: [],
      error: error && error.name === 'AbortError' ? 'Timeout' : String(error.message || error),
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetch every configured feed in parallel. Individual failures are ignored so
 * one dead publisher can never blank the map.
 */
async function fetchAllFeedArticles() {
  const results = await Promise.allSettled(FEEDS.map((feed) => fetchFeed(feed)))

  const articles = []
  const sources = []

  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const { feed, articles: items, error } = result.value
    sources.push({
      id: feed.id,
      source: feed.source,
      country: feed.country,
      count: items.length,
      error,
    })
    for (const item of items) articles.push(item)
  }

  return { articles, sources }
}

module.exports = {
  FEEDS,
  fetchAllFeedArticles,
  parseFeed,
  stripHtml,
  decodeEntities,
  FETCH_TIMEOUT_MS,
}
