import React from 'react'
import { useNewsStore } from '@/features/news/news.store'

interface ActivityTimelineProps {
  className?: string
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ className }) => {
  const { articles, lastUpdated, scope } = useNewsStore()

  const totalSources = new Set(articles.map((a) => a.source)).size

  return (
    <div
      className={`activity-timeline ${className || ''}`}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(5, 8, 13, 0.9) 100%)',
        borderTop: '1px solid rgba(120, 160, 190, 0.16)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-xs text-text">{scope.name}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#438BFF]" />
          <span className="text-xs text-text">{articles.length} stories</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#40D9E8]" />
          <span className="text-xs text-text">{totalSources} sources</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Last sync:</span>
        <span className="text-xs text-accent font-mono">
          {lastUpdated
            ? new Date(lastUpdated).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—'}
        </span>
      </div>
    </div>
  )
}

export default ActivityTimeline
