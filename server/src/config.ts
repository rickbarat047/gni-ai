import path from 'path'

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // GDELT DOC API
  GDALT_DOC_API: 'https://api.gdeltproject.org/api/v2/doc/doc',

  // Geocoding (Nominatim - OpenStreetMap)
  GEOCODING_BASE: 'https://nominatim.openstreetmap.org/search',
  GEOCODING_REVERSE: 'https://nominatim.openstreetmap.org/reverse',

  // Cache TTLs (in seconds)
  CACHE_NEWS_TTL: 600, // 10 minutes
  CACHE_GEOCODE_TTL: 86400 * 7, // 7 days
  CACHE_SEARCH_TTL: 300, // 5 minutes

  // Rate limits
  GDALT_REQUEST_INTERVAL_MS: 1000,
  GEOCODING_REQUEST_INTERVAL_MS: 1100, // Nominatim requires 1 request/sec

  // News config
  DEFAULT_TIMESPAN: '24h',
  MAX_ARTICLES_PER_REQUEST: 250,
  MAX_ARTICLES_DISPLAY: 100,

  // Zoom detail levels (camera height in meters)
  ZOOM_LEVELS: {
    GLOBAL: { minHeight: 20000000, label: 'global' },
    CONTINENT: { minHeight: 6000000, label: 'continent' },
    COUNTRY: { minHeight: 1500000, label: 'country' },
    CITY: { minHeight: 300000, label: 'city' },
  },

  // Category keywords for classification
  CATEGORIES: {
    politics: ['politic', 'government', 'election', 'congress', 'parliament', 'president', 'minister', 'policy', 'senate', 'campaign'],
    conflict: ['war', 'conflict', 'attack', 'military', 'strike', 'invasion', 'bombing', 'troop', 'army', 'missile', 'combat'],
    business: ['economy', 'economic', 'business', 'market', 'stock', 'trade', 'finance', 'investment', 'gdp', 'inflation', 'company', 'corporate'],
    technology: ['technology', 'tech', 'ai', 'artificial intelligence', 'software', 'digital', 'internet', 'app', 'cyber', 'startup', 'silicon'],
    science: ['science', 'research', 'study', 'scientist', 'discovery', 'space', 'nasa', 'physics', 'biology', 'chemistry', 'astronomy'],
    climate: ['climate', 'environment', 'global warming', 'carbon', 'emission', 'greenhouse', 'renewable', 'sustainability', 'pollution', 'weather'],
    disaster: ['disaster', 'earthquake', 'hurricane', 'flood', 'wildfire', 'tsunami', 'volcano', 'storm', 'tornado', 'drought', 'landslide'],
    sports: ['sport', 'football', 'soccer', 'basketball', 'olympics', 'championship', 'league', 'tournament', 'match', 'game', 'player'],
    culture: ['entertainment', 'culture', 'movie', 'film', 'music', 'art', 'celebrity', 'festival', 'theater', 'literature', 'award'],
    health: ['health', 'medical', 'hospital', 'disease', 'virus', 'pandemic', 'vaccine', 'doctor', 'medicine', 'healthcare'],
  },
} as const

export type Category = keyof typeof CONFIG.CATEGORIES

export interface AppConfig {
  port: number
  nodeEnv: string
}
