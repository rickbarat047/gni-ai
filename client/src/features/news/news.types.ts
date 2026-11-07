export type LocationPrecision = 'city' | 'region' | 'country' | 'unknown'

export type NewsCategory =
  | 'politics'
  | 'conflict'
  | 'business'
  | 'technology'
  | 'science'
  | 'climate'
  | 'disaster'
  | 'sports'
  | 'culture'
  | 'health'

export interface NewsArticle {
  id: string
  title: string
  summary: string
  url: string
  source: string
  sourceCountry: string
  publishedAt: string
  eventLocation: string
  country: string
  region: string
  city: string
  latitude: number | null
  longitude: number | null
  locationPrecision: LocationPrecision
  locationConfidence: number
  category: NewsCategory
  imageUrl: string | null
  clusterId: string | null
  relatedSources: string[]
}

export interface NewsResponse {
  success: boolean
  cached: boolean
  stale?: boolean
  count: number
  total?: number
  data: NewsArticle[]
  timestamp: string
  warning?: string
}

export interface GeocodeResult {
  latitude: number
  longitude: number
  displayName: string
  country: string | null
  countryCode: string | null
  region: string | null
  city: string | null
  precision: LocationPrecision
  confidence: number
}

export interface ViewportBounds {
  west: number
  south: number
  east: number
  north: number
}

export interface GeographicalScope {
  level: 'global' | 'continent' | 'country' | 'city'
  center: { lat: number; lon: number } | null
  bounds: ViewportBounds | null
  name: string
  countryCode: string | null
}

export interface NewsFilters {
  category: NewsCategory | 'all' | null
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d' | null
  searchQuery: string
}

export interface NewsStatus {
  success: boolean
  timestamp: string
  services: {
    news: {
      healthy: boolean
      provider: string
      configuredFeeds: number
      respondingFeeds: number
      failingFeeds: Array<{ id: string; error: string }>
    }
    geocoding: { healthy: boolean; provider: string }
  }
  cache: { news: unknown }
  config: { defaultTimespan: string; maxArticles: number }
}

export interface CategoryInfo {
  id: NewsCategory
  label: string
  color: string
}

export const CATEGORY_CONFIG: Record<NewsCategory, CategoryInfo> = {
  politics: { id: 'politics', label: 'Politics', color: '#438BFF' },
  conflict: { id: 'conflict', label: 'Conflict / Security', color: '#FF4D4D' },
  business: { id: 'business', label: 'Business / Economy', color: '#4CAF50' },
  technology: { id: 'technology', label: 'Technology', color: '#40D9E8' },
  science: { id: 'science', label: 'Science', color: '#8B5CF6' },
  climate: { id: 'climate', label: 'Climate / Environment', color: '#14B8A6' },
  disaster: { id: 'disaster', label: 'Disasters', color: '#FB923C' },
  sports: { id: 'sports', label: 'Sports', color: '#EAB308' },
  culture: { id: 'culture', label: 'Culture', color: '#EC4899' },
  health: { id: 'health', label: 'Health', color: '#6366F1' },
}

export const TIME_FILTERS: Array<{
  id: '1h' | '6h' | '24h' | '7d' | '30d'
  label: string
}> = [
  { id: '1h', label: 'Last hour' },
  { id: '6h', label: 'Last 6 hours' },
  { id: '24h', label: 'Last 24 hours' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
]
