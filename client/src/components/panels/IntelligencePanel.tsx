import React from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal, MapPin } from 'lucide-react'
import { useNewsStore } from '@/features/news/news.store'
import { CATEGORY_CONFIG } from '@/features/news/news.types'
import { useGlobeRef } from '@/features/globe/globe.context'
import type { NewsArticle } from '@/features/news/news.types'

interface IntelligencePanelProps {
  className?: string
}

const IntelligencePanel: React.FC<IntelligencePanelProps> = ({ className }) => {
  const {
    visibleArticles,
    scope,
    panelCollapsed,
    togglePanel,
    setSelectedArticle,
    filters,
  } = useNewsStore()
  const { flyToLocation } = useGlobeRef()

  const isCollapsed = panelCollapsed.right

  const handleSelect = (article: NewsArticle) => {
    setSelectedArticle(article)
    if (article.latitude !== null && article.longitude !== null) {
      flyToLocation(article.latitude, article.longitude)
    }
  }

  return (
    <aside
      className={`intelligence-panel ${className || ''} ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        position: 'absolute',
        top: 56,
        right: 0,
        bottom: 64,
        width: isCollapsed ? 56 : 340,
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        background:
          'linear-gradient(180deg, rgba(7, 12, 19, 0.94) 0%, rgba(5, 8, 13, 0.97) 100%)',
        backdropFilter: 'blur(18px)',
        borderLeft: '1px solid rgba(120, 160, 190, 0.16)',
      }}
    >
      <button
        onClick={() => togglePanel('right')}
        className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-panel border border-border flex items-center justify-center text-xs hover:bg-[rgba(120,160,190,0.12)] transition-colors z-10"
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        {isCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!isCollapsed && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-muted tracking-wider uppercase">
                  WORLD INTELLIGENCE
                </div>
                <div className="text-[10px] text-muted">{scope.level}</div>
              </div>

              <div className="text-xs text-text-muted">
                {scope.name} — {visibleArticles.length} stories
                {filters.searchQuery ? ` matching "${filters.searchQuery}"` : ''}
              </div>

              {visibleArticles.length === 0 ? (
                <div className="py-8 text-center">
                  <MapPin size={32} className="mx-auto opacity-20" />
                  <div className="mt-3 text-xs text-text-muted">
                    No stories match the current filters.
                  </div>
                  <div className="mt-1 text-[10px] text-muted">
                    Try clearing the search or widening the time range.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleArticles.slice(0, 12).map((article) => {
                    const config =
                      CATEGORY_CONFIG[
                        article.category as keyof typeof CATEGORY_CONFIG
                      ]
                    return (
                      <button
                        key={article.id}
                        onClick={() => handleSelect(article)}
                        className="w-full text-left group rounded border border-transparent hover:border-border px-2 py-2 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                            style={{ backgroundColor: config?.color || '#438BFF' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-text font-medium line-clamp-2 group-hover:text-accent transition-colors">
                              {article.title}
                            </div>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <span className="text-[10px] text-muted">
                                {article.source}
                              </span>
                              <span className="text-[10px] text-muted">·</span>
                              <span className="text-[10px] text-muted">
                                {article.eventLocation || 'Unlocated'}
                              </span>
                              <span className="text-[10px] text-muted">·</span>
                              <span className="text-[10px] text-muted">
                                {new Date(article.publishedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                  {visibleArticles.length > 12 && (
                    <div className="text-[10px] text-muted text-center pt-1">
                      +{visibleArticles.length - 12} more stories on the globe
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <button
          onClick={() => togglePanel('right')}
          className="w-full py-3 rounded border border-border text-xs text-muted hover:bg-[rgba(120,160,190,0.12)] transition-colors"
        >
          <MoreHorizontal size={14} className="mr-2" />
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
    </aside>
  )
}

export default IntelligencePanel
