import React from 'react'
import { Search, Settings } from 'lucide-react'
import { useNewsStore } from '@/features/news/news.store'

interface HeaderProps {
  className?: string
}

const Header: React.FC<HeaderProps> = ({ className }) => {
  const { lastUpdated } = useNewsStore()

  const now = new Date().toUTCString()

  return (
    <header
      className={`header ${className || ''}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'linear-gradient(180deg, rgba(5, 8, 13, 0.8) 0%, transparent 100%)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(120, 160, 190, 0.16)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded bg-accent flex items-center justify-center text-[#021014] font-bold text-xs"
        >
          W
        </div>
        <div>
          <div className="font-bold text-sm tracking-tight">WORLDVIEW</div>
          <div className="text-[10px] text-muted tracking-wider uppercase">
            Global Intelligence
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="hidden md:flex items-center gap-4">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search countries, cities, topics..."
              className="w-full bg-[rgba(255,255,255,0.03)] border border-border rounded px-3 py-1.5 pl-9 text-xs text-text outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        <div className="flex items-end gap-3 text-xs">
          <div className="text-right hidden sm:block">
            <div className="text-text font-mono">UTC</div>
            <div className="text-accent font-mono">
              {now.split(' ')[4]}
            </div>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
              <span className="text-[10px] text-muted">CONNECTED</span>
            </div>
            <div className="text-right">
              <div className="text-text text-xs">Data updated</div>
              <div className="text-muted text-xs">
                {lastUpdated
                  ? new Date(lastUpdated).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </div>
            </div>
          </div>

          <button className="btn-glass" title="Settings">
            <Settings size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
