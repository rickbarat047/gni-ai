import { GlobeProvider } from '@/features/globe/globe.context'
import Header from '@/components/header/Header'
import DiscoveryPanel from '@/components/panels/DiscoveryPanel'
import IntelligencePanel from '@/components/panels/IntelligencePanel'
import NewsDetailsPanel from '@/components/panels/NewsDetailsPanel'
import ActivityTimeline from '@/components/panels/ActivityTimeline'
import GlobeView from '@/features/globe/GlobeView'
import GlobeControls from '@/features/globe/GlobeControls'

function App() {
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
