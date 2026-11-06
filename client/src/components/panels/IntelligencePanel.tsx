import React from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal, MapPin } from 'lucide-react'
import { useNewsStore } from '@/features/news/news.store'
import { CATEGORY_CONFIG } from '@/features/news/news.types'

interface IntelligencePanelProps {
  className?: string
}

const IntelligencePanel: React.FC<IntelligencePanelProps> = ({ className }) => {
  const {
    visibleArticles,
    scope,
    panelCollapsed,
    togglePanel,
  } = useNewsStore()

  const isCollapsed = panelCollapsed.right

  return (
    <aside
      className={`intelligence-panel ${className || ''} ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        position: 'absolute',
        top: 56,
        right: 0,
        bottom: 0,
        width: isCollapsed ? 56 : 340,
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => togglePanel('right')}
        className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-panel border border-border flex items-center justify-center text-xs hover:bg-[rgba(120,160,190,0.12)] transition-colors z-10"
        title="Collapse"
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
              </div>

              {visibleArticles.length === 0 ? (
                <div className="py-8 text-center">
                  <MapPin size={32} className="mx-auto opacity-20" />
                  <div className="mt-3 text-xs text-text-muted">
                    No mapped stories found for this area.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleArticles.slice(0, 8).map((article) => (
                    <div key={article.id} className="group cursor-pointer">
                      <div className="flex items-start gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            CATEGORY_CONFIG[article.category as keyof typeof CATEGORY_CONFIG]?.color ||
                            '#438BFF'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-text font-medium line-clamp-1 group-hover:text-accent transition-colors">
                            {article.title}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-muted">
                              {article.source}
                            </span>
                            <span className="text-[10px] text-muted">·</span>
                            <span className="text-[10px] text-muted">
                              {article.eventLocation || article.country}
                            </span>
                            <span className="text-[10px] text-muted">·</span>
                            <span className="text-[10px] text-muted">
                              {new Date(article.publishedAt).toLocaleDateString(
                                [],
                                { month: 'short', day: 'numeric' },
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
          Expand
        </button>
      </div>
    </aside>
  )
}

export default IntelligencePanel
