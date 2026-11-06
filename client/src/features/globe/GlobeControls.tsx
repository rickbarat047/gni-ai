import React from 'react'
import { RotateCw } from 'lucide-react'
import { useNewsStore } from '@/features/news/news.store'
import { useGlobeRef } from '@/features/globe/globe.context'

interface GlobeControlsProps {
  className?: string
}

const GlobeControls: React.FC<GlobeControlsProps> = ({ className }) => {
  const { resetCamera, flyToLocation } = useGlobeRef()
  const { scope, setScope } = useNewsStore()

  const handleReset = () => {
    resetCamera()
    setScope({
      level: 'global',
      center: { lat: 20, lon: 0 },
      bounds: { west: -180, south: -90, east: 180, north: 90 },
      name: 'Global',
      countryCode: null,
    })
  }

  return (
    <div
      className={`globe-controls ${className || ''}`}
      style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      <div style={{ pointerEvents: 'auto', display: 'flex', gap: 8 }}>
        <button
          onClick={handleReset}
          className="btn-glass"
          title="Reset to global view"
        >
          <RotateCw size={16} />
          <span className="ml-1 text-xs">Global</span>
        </button>
        <button
          className="btn-glass"
          title="Toggle auto-rotation"
          onClick={() => {
            // toggle handled via globe context; flyToLocation reserved for navigation
            void flyToLocation
          }}
        >
          <RotateCw size={16} />
        </button>
      </div>

      <div className="glass-panel px-3 py-2 rounded text-xs border">
        <div className="flex items-center gap-1 mb-1">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-accent">LIVE</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>{scope.level}</span>
          <span>{scope.name}</span>
        </div>
      </div>
    </div>
  )
}

export default GlobeControls
