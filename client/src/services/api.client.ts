import type {
  NewsResponse,
  NewsStatus,
  ViewportBounds,
  GeocodeResult,
} from '@/features/news/news.types'

const API_BASE = '/api'

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getNews(params?: {
    query?: string
    timespan?: string
    maxRecords?: number
    category?: string
    timeRange?: string
    bbox?: string
    lat?: string
    lon?: string
  }): Promise<NewsResponse> {
    const searchParams = new URLSearchParams()
    if (params?.query) searchParams.set('query', params.query)
    if (params?.timespan) searchParams.set('timespan', params.timespan)
    if (params?.maxRecords)
      searchParams.set('maxRecords', String(params.maxRecords))
    if (params?.category) searchParams.set('category', params.category)
    if (params?.timeRange) searchParams.set('timeRange', params.timeRange)
    if (params?.bbox) searchParams.set('bbox', params.bbox)
    if (params?.lat) searchParams.set('lat', params.lat)
    if (params?.lon) searchParams.set('lon', params.lon)

    return this.request<NewsResponse>(`/news?${searchParams.toString()}`)
  }

  async getRegionNews(
    bounds: ViewportBounds,
    timespan?: string,
  ): Promise<NewsResponse> {
    const searchParams = new URLSearchParams()
    searchParams.set('west', bounds.west.toString())
    searchParams.set('south', bounds.south.toString())
    searchParams.set('east', bounds.east.toString())
    searchParams.set('north', bounds.north.toString())
    if (timespan) searchParams.set('timespan', timespan)

    return this.request<NewsResponse>(`/news/region?${searchParams.toString()}`)
  }

  async searchNews(query: string, timespan?: string): Promise<NewsResponse> {
    const searchParams = new URLSearchParams()
    searchParams.set('q', query)
    if (timespan) searchParams.set('timespan', timespan)

    return this.request<NewsResponse>(`/news/search?${searchParams.toString()}`)
  }

  async getCategories(): Promise<{
    success: boolean
    data: Array<{ id: string; label: string }>
  }> {
    return this.request(`/news/categories`)
  }

  async getStatus(): Promise<NewsStatus> {
    return this.request(`/news/status`)
  }

  async geocode(query: string): Promise<{
    success: boolean
    data: GeocodeResult | null
  }> {
    const searchParams = new URLSearchParams()
    searchParams.set('q', query)
    return this.request(`/geocode?${searchParams.toString()}`)
  }

  async reverseGeocode(lat: number, lon: number): Promise<{
    success: boolean
    data: GeocodeResult | null
  }> {
    const searchParams = new URLSearchParams()
    searchParams.set('lat', lat.toString())
    searchParams.set('lon', lon.toString())
    return this.request(`/geocode/reverse?${searchParams.toString()}`)
  }
}

export const apiClient = new ApiClient()
