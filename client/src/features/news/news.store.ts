import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  NewsArticle,
  GeographicalScope,
  NewsFilters,
  NewsStatus,
} from './news.types'

interface NewsState {
  // Articles
  articles: NewsArticle[]
  visibleArticles: NewsArticle[]
  selectedArticle: NewsArticle | null
  hoveredArticle: NewsArticle | null
  isLoading: boolean
  isRefreshing: boolean
  lastUpdated: string | null
  error: string | null
  status: NewsStatus | null

  // Geographical scope
  scope: GeographicalScope

  // Filters
  filters: NewsFilters

  // UI state
  panelCollapsed: {
    left: boolean
    right: boolean
    bottom: boolean
  }
  detailsOpen: boolean

  // Actions
  setArticles: (articles: NewsArticle[]) => void
  setVisibleArticles: (articles: NewsArticle[]) => void
  setSelectedArticle: (article: NewsArticle | null) => void
  setHoveredArticle: (article: NewsArticle | null) => void
  setLoading: (loading: boolean) => void
  setRefreshing: (refreshing: boolean) => void
  setLastUpdated: (ts: string) => void
  setError: (error: string | null) => void
  setStatus: (status: NewsStatus | null) => void
  setScope: (scope: GeographicalScope) => void
  setFilters: (filters: Partial<NewsFilters>) => void
  togglePanel: (panel: 'left' | 'right' | 'bottom') => void
  setDetailsOpen: (open: boolean) => void
  refreshNews: () => void
  clearError: () => void
}

const DEFAULT_SCOPE: GeographicalScope = {
  level: 'global',
  center: { lat: 20, lon: 0 },
  bounds: {
    west: -180,
    south: -90,
    east: 180,
    north: 90,
  },
  name: 'Global',
  countryCode: null,
}

const DEFAULT_FILTERS: NewsFilters = {
  category: null,
  timeRange: null,
  searchQuery: '',
}

export const useNewsStore = create<NewsState>()(
  persist(
    (set) => ({
      articles: [],
      visibleArticles: [],
      selectedArticle: null,
      hoveredArticle: null,
      isLoading: false,
      isRefreshing: false,
      lastUpdated: null,
      error: null,
      status: null,
      scope: DEFAULT_SCOPE,
      filters: DEFAULT_FILTERS,
      panelCollapsed: { left: false, right: false, bottom: false },
      detailsOpen: false,

      setArticles: (articles) => set({ articles }),
      setVisibleArticles: (articles) => set({ visibleArticles: articles }),
      setSelectedArticle: (article) => set({ selectedArticle: article, detailsOpen: article !== null }),
      setHoveredArticle: (article) => set({ hoveredArticle: article }),
      setLoading: (loading) => set({ isLoading: loading }),
      setRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
      setLastUpdated: (ts) => set({ lastUpdated: ts }),
      setError: (error) => set({ error }),
      setStatus: (status) => set({ status }),
      setScope: (scope) => set({ scope }),
      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
      togglePanel: (panel) =>
        set((state) => ({
          panelCollapsed: { ...state.panelCollapsed, [panel]: !state.panelCollapsed[panel] },
        })),
      setDetailsOpen: (open) => set({ detailsOpen: open }),
      refreshNews: () => set({ isRefreshing: true }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'news-store',
      partialize: (state) => ({
        filters: state.filters,
        panelCollapsed: state.panelCollapsed,
      }),
    },
  ),
)
