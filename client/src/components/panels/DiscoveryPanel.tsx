import React from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
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
  } = useNewsStore()

  const isCollapsed = panelCollapsed.left

  const handleCategoryToggle = (cat: string) => {
    setFilters({
      category: filters.category === cat ? null : (cat as any),
    })
  }

  const handleTimeSelect = (id: string) => {
    setFilters({ timeRange: id as any })
  }

  return (
    <aside
      className={`discovery-panel ${className || ''} ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        position: 'absolute',
        top: 56,
        left: 0,
        bottom: 0,
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
        title="Collapse"
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
                  { id: 'all', label: 'Global Overview' },
                  { id: 'breaking', label: 'Breaking News' },
                  ...Object.entries(CATEGORY_CONFIG).map(([id, cat]) => ({
                    id,
                    label: cat.label,
                  })),
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleCategoryToggle(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${
                      filters.category === item.id
                        ? 'bg-accent text-[#021014] font-medium'
                        : 'text-text hover:bg-[rgba(120,160,190,0.12)]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {filters.category === item.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#021014]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <div className="text-[10px] text-muted tracking-wider uppercase mb-2">
                TIME FILTER
              </div>
              <div className="space-y-1">
                {TIME_FILTERS.map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => handleTimeSelect(tf.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors ${
                      filters.timeRange === tf.id
                        ? 'bg-accent text-[#021014] font-medium'
                        : 'text-text hover:bg-[rgba(120,160,190,0.12)]'
                    }`}
                  >
                    <span>{tf.label}</span>
                    {filters.timeRange === tf.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#021014]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <div className="text-[10px] text-muted tracking-wider uppercase mb-2">
                VIEW
              </div>
              <div className="text-xs text-text-muted">
                {articles.length} stories mapped
              </div>
              <div className="mt-2 text-xs text-text-muted">
                {articles.filter((a) => a.latitude !== null).length} with location
              </div>
            </div>
          </>
        )}

        <button
          onClick={() => togglePanel('left')}
          className="w-full py-3 rounded border border-border text-xs text-muted hover:bg-[rgba(120,160,190,0.12)] transition-colors"
        >
          <MoreHorizontal size={14} className="mr-2" />
          Expand
        </button>
      </div>
    </aside>
  )
}

export default DiscoveryPanel
