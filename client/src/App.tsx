import { useEffect } from 'react'
import { apiClient } from '@/services/api.client'
import { GlobeProvider } from '@/features/globe/globe.context'
import Header from '@/components/header/Header'
import DiscoveryPanel from '@/components/panels/DiscoveryPanel'
import IntelligencePanel from '@/components/panels/IntelligencePanel'
import NewsDetailsPanel from '@/components/panels/NewsDetailsPanel'
import ActivityTimeline from '@/components/panels/ActivityTimeline'
import GlobeView from '@/features/globe/GlobeView'
import GlobeControls from '@/features/globe/GlobeControls'

function App() {
  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const [statusRes, newsRes] = await Promise.allSettled([
          apiClient.getStatus(),
          apiClient.getNews({ timespan: '24h', maxRecords: 100 }),
        ])

        if (mounted && statusRes.status === 'fulfilled') {
          // status handled in store via setStatus if needed
        }

        if (mounted && newsRes.status === 'fulfilled') {
          const data = newsRes.value
          if (data.success && data.data) {
            // initial news loaded
          }
        }
      } catch (err) {
        console.warn('Initial load failed:', err)
      }
    }

    init()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <GlobeProvider>
      <div
        className="app"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <GlobeView />
        <GlobeControls />
        <Header />
        <DiscoveryPanel />
        <IntelligencePanel />
        <ActivityTimeline />
        <NewsDetailsPanel />
      </div>
    </GlobeProvider>
  )
}

export default App
