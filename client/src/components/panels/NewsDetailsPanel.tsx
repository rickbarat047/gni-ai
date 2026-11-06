import React from 'react'
import { X, Link, RefreshCw } from 'lucide-react'
import { useNewsStore } from '@/features/news/news.store'
import { CATEGORY_CONFIG } from '@/features/news/news.types'

interface NewsDetailsPanelProps {
  className?: string
}

const NewsDetailsPanel: React.FC<NewsDetailsPanelProps> = ({ className }) => {
  const {
    selectedArticle,
    setSelectedArticle,
    detailsOpen,
  } = useNewsStore()

  if (!detailsOpen || !selectedArticle) return null

  const categoryConfig =
    CATEGORY_CONFIG[selectedArticle.category as keyof typeof CATEGORY_CONFIG]
  const categoryColor = categoryConfig ? categoryConfig.color : '#438BFF'

  const locationText =
    selectedArticle.eventLocation || selectedArticle.country || 'Unknown'
  const publishedText = new Date(selectedArticle.publishedAt).toLocaleString(
    [],
    { dateStyle: 'medium', timeStyle: 'short' },
  )

  return (
    <div
      className={`news-details-panel ${className || ''}`}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '42vh',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, transparent 0%, rgba(5, 8, 13, 0.97) 100%)',
        borderTop: '1px solid rgba(120, 160, 190, 0.16)',
        backdropFilter: 'blur(20px)',
        transition: 'transform 0.3s ease',
      }}
    >
      <div className="px-4 py-2 flex items-center justify-between border-b border-border/50">
        <button
          onClick={() => setSelectedArticle(null)}
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[rgba(120,160,190,0.12)] transition-colors"
        >
          <X size={16} />
        </button>
        <div className="text-[10px] text-muted tracking-wider uppercase font-medium">
          EVENT DETAILS
        </div>
        <button className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[rgba(120,160,190,0.12)] transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2.5 h-2.5 rounded-full ${categoryColor}`} />
          <span className="text-xs text-text font-medium uppercase tracking-wider">
            {selectedArticle.category}
          </span>
          {selectedArticle.locationPrecision !== 'unknown' && (
            <>
              {' · '}
              <span className="text-[10px] text-muted">
                {selectedArticle.locationPrecision} precision
              </span>
            </>
          )}
        </div>

        <h1 className="text-xl font-bold text-text mb-2 leading-snug">
          {selectedArticle.title}
        </h1>

        <div className="flex flex-wrap gap-3 mb-4 text-xs text-muted">
          <span>
            <span className="text-text">Location:</span> {locationText}
          </span>
          <span>
            <span className="text-text">Source:</span> {selectedArticle.source}
          </span>
          <span>
            <span className="text-text">Published:</span> {publishedText} UTC
          </span>
        </div>

        <div className="mb-4">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
            SUMMARY
          </div>
          <p className="text-text/90 leading-relaxed">
            {selectedArticle.summary}
          </p>
        </div>

        <div className="mb-4 p-3 rounded bg-[rgba(120,160,190,0.05)] border border-border/50">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
            SOURCE
          </div>
          <a
            href={selectedArticle.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-accent text-sm font-medium hover:underline"
          >
            Open original article <Link size={14} />
          </a>
          <div className="mt-1 text-[10px] text-muted">
            {selectedArticle.sourceCountry
              ? `Publisher country: ${selectedArticle.sourceCountry}`
              : 'Publisher country not available'}
          </div>
        </div>

        {selectedArticle.relatedSources &&
          selectedArticle.relatedSources.length > 1 && (
            <div className="mb-4">
              <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
                ADDITIONAL COVERAGE
              </div>
              <div className="text-xs text-muted">
                {selectedArticle.relatedSources.length} sources covering this event
              </div>
            </div>
          )}
      </div>
    </div>
  )
}

export default NewsDetailsPanel
