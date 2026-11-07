import { createContext, useContext, useRef, useCallback } from 'react'

interface GlobeRef {
  resetCamera: () => void
  flyToLocation: (lat: number, lon: number, height?: number) => void
  toggleRotation: () => boolean
}

interface GlobeContextValue extends GlobeRef {
  registerViewer: (api: GlobeRef) => void
}

export const GlobeContext = createContext<GlobeContextValue | null>(null)

export const useGlobeRef = () => {
  const ctx = useContext(GlobeContext)
  if (!ctx) throw new Error('useGlobeRef must be used within GlobeProvider')
  return ctx
}

export const GlobeProvider = ({ children }: { children: React.ReactNode }) => {
  const viewerRef = useRef<GlobeRef | null>(null)

  const registerViewer = useCallback((api: GlobeRef) => {
    viewerRef.current = api
  }, [])

  const resetCamera = useCallback(() => {
    viewerRef.current?.resetCamera?.()
  }, [])

  const flyToLocation = useCallback(
    (lat: number, lon: number, height?: number) => {
      viewerRef.current?.flyToLocation?.(lat, lon, height)
    },
    [],
  )

  const toggleRotation = useCallback(() => {
    return viewerRef.current?.toggleRotation?.() ?? false
  }, [])

  return (
    <GlobeContext.Provider
      value={{ registerViewer, resetCamera, flyToLocation, toggleRotation }}
    >
      {children}
    </GlobeContext.Provider>
  )
}
