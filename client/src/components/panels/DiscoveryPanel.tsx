import React from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal, X } from 'lucide-react'
import { useNewsStore } from '@/features/news/news.store'
import { CATEGORY_CONFIG, TIME_FILTERS } from '@/features/news/news.types'

interface DiscoveryPanelProps {
  className?: string
}

const DiscoveryPanel: React.FC<DiscoveryPanelProps> = ({ className }) => {
  const {
    filters,
    setFilters,
    panelCollapsed,
    togglePanel,
    articles,
    visibleArticles,
  } = useNewsStore()

  const isCollapsed = panelCollapsed.left

  const counts = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const article of articles) {
      map[article.category] = (map[article.category] || 0) + 1
    }
    return map
  }, [articles])

  const hasFilters =
    filters.category !== null || filters.timeRange !== null || !!filters.searchQuery

  const handleCategoryToggle = (id: string) => {
    if (id === 'all') {
      setFilters({ category: null, timeRange: null })
      return
    }
    if (id === 'breaking') {
      setFilters({ category: null, timeRange: '1h' })
      return
    }
    setFilters({
      category: filters.category === id ? null : (id as any),
    })
  }

  const handleTimeSelect = (id: string) => {
    setFilters({ timeRange: filters.timeRange === id ? null : (id as any) })
  }

  const isGlobalActive =
    filters.category === null && filters.timeRange === null && !filters.searchQuery
  const isBreakingActive = filters.category === null && filters.timeRange === '1h'

  return (
    <aside
      className={`discovery-panel ${className || ''} ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        position: 'absolute',
        top: 56,
        left: 0,
        bottom: 64,
        width: isCollapsed ? 56 : 280,
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => togglePanel('left')}
        className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-panel border border-border flex items-center justify-center text-xs hover:bg-[rgba(120,160,190,0.12)] transition-colors z-10"
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!isCollapsed && (
          <>
            <div className="space-y-2">
              <div className="text-[10px] text-muted tracking-wider uppercase mb-1">
                DISCOVER
              </div>
              <div className="space-y-1">
                {[
                  { id: 'all', label: 'Global Overview', count: articles.length },
                  {
                    id: 'breaking',
                    label: 'Breaking News',
                    count: articles.filter(
                      (article) =>
                        Date.now() - new Date(article.publishedAt).getTime() <
                        60 * 60 * 1000,
                    ).length,
                  },
                  ...Object.entries(CATEGORY_CONFIG).map(([id, cat]) => ({
                    id,
                    label: cat.label,
                    count: counts[id] || 0,
                  })),
                ].map((item) => {
                  const active =
                    item.id === 'all'
                      ? isGlobalActive
                      : item.id === 'breaking'
                        ? isBreakingActive
                        : filters.category === item.id

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleCategoryToggle(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${
                        active
                          ? 'bg-accent text-[#021014] font-medium'
                          : 'text-text hover:bg-[rgba(120,160,190,0.12)]'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={
                          active ? 'text-[#021014] text-[10px]' : 'text-muted text-[10px]'
                        }
                      >
                        {item.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <div className="text-[10px] text-muted tracking-wider uppercase mb-2">
                TIME FILTER
              </div>
              <div className="space-y-1">
                {TIME_FILTERS.map((timeFilter) => (
                  <button
                    key={timeFilter.id}
                    onClick={() => handleTimeSelect(timeFilter.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${
                      filters.timeRange === timeFilter.id
                        ? 'bg-accent text-[#021014] font-medium'
                        : 'text-text hover:bg-[rgba(120,160,190,0.12)]'
                    }`}
                  >
                    <span>{timeFilter.label}</span>
                    {filters.timeRange === timeFilter.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#021014]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {hasFilters && (
              <button
                onClick={() =>
                  setFilters({ category: null, timeRange: null, searchQuery: '' })
                }
                className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded border border-border text-[11px] text-muted hover:border-accent hover:text-accent transition-colors"
              >
                <X size={12} /> Clear filters
              </button>
            )}

            <div className="border-t border-border pt-3">
              <div className="text-[10px] text-muted tracking-wider uppercase mb-2">
                VIEW
              </div>
              <div className="text-xs text-text-muted">
                {visibleArticles.length} stories in view
              </div>
              <div className="mt-2 text-xs text-text-muted">
                {visibleArticles.filter((article) => article.latitude !== null).length}{' '}
                mapped to a place
              </div>
              <div className="mt-1 text-[10px] text-muted leading-relaxed">
                Locations come from place names in each headline. Stories with no
                place stay off the globe.
              </div>
            </div>
          </>
        )}

        <button
          onClick={() => togglePanel('left')}
          className="w-full py-3 rounded border border-border text-xs text-muted hover:bg-[rgba(120,160,190,0.12)] transition-colors"
        >
          <MoreHorizontal size={14} className="mr-2" />
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
    </aside>
  )
}

export default DiscoveryPanel
