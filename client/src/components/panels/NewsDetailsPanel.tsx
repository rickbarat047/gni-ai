import React from 'react'
import { X, Link, MapPin } from 'lucide-react'
import { useNewsStore } from '@/features/news/news.store'
import { CATEGORY_CONFIG } from '@/features/news/news.types'
import { useGlobeRef } from '@/features/globe/globe.context'

interface NewsDetailsPanelProps {
  className?: string
}

const NewsDetailsPanel: React.FC<NewsDetailsPanelProps> = ({ className }) => {
  const { selectedArticle, setSelectedArticle, detailsOpen } = useNewsStore()
  const { flyToLocation } = useGlobeRef()

  if (!detailsOpen || !selectedArticle) return null

  const categoryConfig =
    CATEGORY_CONFIG[selectedArticle.category as keyof typeof CATEGORY_CONFIG]
  const categoryColor = categoryConfig ? categoryConfig.color : '#438BFF'

  const locationText =
    selectedArticle.eventLocation || selectedArticle.country || 'Unlocated'
  const publishedText = new Date(selectedArticle.publishedAt).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const hasCoordinates =
    selectedArticle.latitude !== null && selectedArticle.longitude !== null

  return (
    <div
      className={`news-details-panel ${className || ''}`}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '46vh',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        background:
          'linear-gradient(180deg, rgba(5, 8, 13, 0.86) 0%, rgba(5, 8, 13, 0.98) 100%)',
        borderTop: '1px solid rgba(120, 160, 190, 0.16)',
        backdropFilter: 'blur(20px)',
        transition: 'transform 0.3s ease',
      }}
    >
      <div className="px-4 py-2 flex items-center justify-between border-b border-border/50">
        <button
          onClick={() => setSelectedArticle(null)}
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[rgba(120,160,190,0.12)] transition-colors"
          title="Close"
        >
          <X size={16} />
        </button>
        <div className="text-[10px] text-muted tracking-wider uppercase font-medium">
          EVENT DETAILS
        </div>
        <button
          onClick={() => {
            if (hasCoordinates) {
              flyToLocation(selectedArticle.latitude!, selectedArticle.longitude!, 900000)
            }
          }}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
            hasCoordinates
              ? 'hover:bg-[rgba(120,160,190,0.12)] text-accent'
              : 'text-muted/30 cursor-default'
          }`}
          title={hasCoordinates ? 'Locate on globe' : 'No location for this story'}
        >
          <MapPin size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-5">
          {selectedArticle.imageUrl && (
            <img
              src={selectedArticle.imageUrl}
              alt=""
              className="hidden sm:block w-48 h-32 object-cover rounded border border-border/60 shrink-0"
              onError={(event) => {
                ;(event.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: categoryColor }}
              />
              <span className="text-xs text-text font-medium uppercase tracking-wider">
                {categoryConfig?.label || selectedArticle.category}
              </span>
              {selectedArticle.locationPrecision !== 'unknown' && (
                <>
                  <span className="text-muted">·</span>
                  <span className="text-[10px] text-muted">
                    {selectedArticle.locationPrecision} precision
                  </span>
                </>
              )}
            </div>

            <h1 className="text-xl font-bold text-text mb-2 leading-snug">
              {selectedArticle.title}
            </h1>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-muted">
              <span>
                <span className="text-text">Location:</span> {locationText}
              </span>
              <span>
                <span className="text-text">Source:</span> {selectedArticle.source}
              </span>
              <span>
                <span className="text-text">Published:</span> {publishedText}
              </span>
            </div>

            {selectedArticle.summary &&
              selectedArticle.summary !== selectedArticle.title && (
                <div className="mb-4">
                  <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
                    SUMMARY
                  </div>
                  <p className="text-sm text-text/85 leading-relaxed">
                    {selectedArticle.summary}
                  </p>
                </div>
              )}

            <div className="p-3 rounded bg-[rgba(120,160,190,0.05)] border border-border/50">
              <a
                href={selectedArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-accent text-sm font-medium hover:underline"
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
                <div className="mt-4">
                  <div className="text-[10px] text-muted uppercase tracking-wider mb-1">
                    ADDITIONAL COVERAGE
                  </div>
                  <div className="text-xs text-muted">
                    {selectedArticle.relatedSources.length - 1} more source
                    {selectedArticle.relatedSources.length > 2 ? 's' : ''} covering
                    this event
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewsDetailsPanel
