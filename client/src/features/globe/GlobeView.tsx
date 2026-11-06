import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
} from 'react'
import * as Cesium from 'cesium'
import { useNewsStore } from '@/features/news/news.store'
import {
  GLOBE_CONFIG,
  categoryMarkerColors,
} from '@/features/globe/globe.config'
import {
  getDetailLevel,
  getViewportBounds,
  getCameraPosition,
  getCameraHeight,
} from '@/features/globe/camera.utils'
import { apiClient } from '@/services/api.client'
import { useGlobeRef } from '@/features/globe/globe.context'
import type { NewsArticle } from '@/features/news/news.types'

interface GlobeViewProps {
  className?: string
}

const GlobeView: React.FC<GlobeViewProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  let autoRotationFrame: number | null = null
  let isUserInteracting = false

  const {
    setArticles,
    setVisibleArticles,
    setScope,
    setSelectedArticle,
    setError,
    clearError,
    scope,
    articles,
  } = useNewsStore()

  const { registerViewer } = useGlobeRef()

  const [isReady, setIsReady] = useState(false)
  const [imageryWarning, setImageryWarning] = useState<string | null>(null)
  const markersRef = useRef<Map<string, Cesium.Entity>>(new Map())
  const clustersRef = useRef<Map<string, Cesium.Entity>>(new Map())
  let viewportDebounce: ReturnType<typeof setTimeout> | null = null

  useEffect(() => {
    if (!containerRef.current) return

    try {
      const viewer = new Cesium.Viewer(containerRef.current, {
        timeline: false,
        animation: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        homeButton: false,
        infoBox: false,
        selectionIndicator: false,
        fullscreenButton: false,
        baseLayerPicker: false,
        geocoder: false,
        creditContainer: document.createElement('div'),
        shouldAnimate: true,
      })

      // Add base imagery layer
      viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: GLOBE_CONFIG.IMAGERY_PROVIDERS.OPEN_STREET_MAP.url,
          credit: new Cesium.Credit(
            GLOBE_CONFIG.IMAGERY_PROVIDERS.OPEN_STREET_MAP.attribution,
          ),
        }),
      )

      viewerRef.current = viewer

      // Set initial camera
      const { longitude, latitude, height } =
        GLOBE_CONFIG.CAMERA.DEFAULT_POSITION
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
        duration: 2.0,
      })

      // Enable lighting and atmosphere
      viewer.scene.globe.enableLighting = true
      viewer.scene.globe.depthTestAgainstTerrain = true
      viewer.scene.globe.showGroundAtmosphere = true

      // Try Bing imagery if key available
      if (GLOBE_CONFIG.IMAGERY_PROVIDERS.BING.enabled) {
        try {
          viewer.imageryLayers.removeAll()
          viewer.imageryLayers.addImageryProvider(
            new Cesium.BingMapsImageryProvider({
              key: GLOBE_CONFIG.IMAGERY_PROVIDERS.BING.key,
              mapStyle: Cesium.BingMapsStyle.AERIAL,
            }),
          )
        } catch {
          setImageryWarning('Premium imagery unavailable, using fallback')
        }
      }

      // Terrain
      Cesium.createWorldTerrainAsync().then((terrainProvider) => {
        viewer.terrainProvider = terrainProvider
      })

      setIsReady(true)
      clearError()
    } catch (err) {
      setError(
        `Failed to initialize 3D globe: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
      setIsReady(false)
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
      if (autoRotationFrame) {
        cancelAnimationFrame(autoRotationFrame)
      }
      if (viewportDebounce) clearTimeout(viewportDebounce)
    }
  }, [])

  // Auto rotation - pause on interaction
  useEffect(() => {
    if (!viewerRef.current || !GLOBE_CONFIG.AUTO_ROTATION.ENABLED) return

    const viewer = viewerRef.current

    const startInteraction = () => {
      isUserInteracting = true
    }
    const endInteraction = () => {
      isUserInteracting = false
    }

    const handler = viewer.screenSpaceEventHandler
    handler.setInputAction(startInteraction, Cesium.ScreenSpaceEventType.LEFT_DOWN)
    handler.setInputAction(startInteraction, Cesium.ScreenSpaceEventType.RIGHT_DOWN)
    handler.setInputAction(startInteraction, Cesium.ScreenSpaceEventType.MIDDLE_DOWN)
    handler.setInputAction(startInteraction, Cesium.ScreenSpaceEventType.WHEEL)
    handler.setInputAction(endInteraction, Cesium.ScreenSpaceEventType.LEFT_UP)
    handler.setInputAction(endInteraction, Cesium.ScreenSpaceEventType.RIGHT_UP)
    handler.setInputAction(endInteraction, Cesium.ScreenSpaceEventType.MIDDLE_UP)

    const rotate = () => {
      if (!isUserInteracting) {
        const camera = viewer.camera
        camera.rotate(Cesium.Cartesian3.UNIT_Z, -GLOBE_CONFIG.AUTO_ROTATION.SPEED)
      }
    }

    viewer.clock.onTick.addEventListener(rotate)

    return () => {
      viewer.clock.onTick.removeEventListener(rotate)
    }
  }, [])

  // Camera move handler - debounced viewport updates
  useEffect(() => {
    if (!viewerRef.current) return

    const viewer = viewerRef.current

    const handleCameraMove = () => {
      if (viewportDebounce) clearTimeout(viewportDebounce)

      viewportDebounce = setTimeout(() => {
        const height = getCameraHeight(viewer.camera)
        const level = getDetailLevel(height)
        const bounds = getViewportBounds(viewer)
        const position = getCameraPosition(viewer.camera)

        setScope({
          level,
          center: { lat: position.latitude, lon: position.longitude },
          bounds,
          name: level.charAt(0).toUpperCase() + level.slice(1),
          countryCode: null,
        })

        fetchNewsForViewport(bounds)
      }, 300)
    }

    viewer.camera.moveStart.addEventListener(handleCameraMove)
    viewer.camera.moveEnd.addEventListener(handleCameraMove)
    viewer.camera.changed.addEventListener(handleCameraMove)

    return () => {
      viewer.camera.moveStart.removeEventListener(handleCameraMove)
      viewer.camera.moveEnd.removeEventListener(handleCameraMove)
      viewer.camera.changed.removeEventListener(handleCameraMove)
      if (viewportDebounce) clearTimeout(viewportDebounce)
    }
  }, [])

  // Fetch news for current viewport
  const fetchNewsForViewport = useCallback(
    async (bounds: { west: number; south: number; east: number; north: number }) => {
      try {
        const response = await apiClient.getRegionNews(bounds)
        if (response.success && response.data) {
          setVisibleArticles(response.data)
          setArticles(response.data)
        }
      } catch (err) {
        console.warn('Viewport news fetch failed:', err)
      }
    },
    [setVisibleArticles, setArticles],
  )

  // Reset camera to global view
  const resetCamera = useCallback(() => {
    if (!viewerRef.current) return
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(0, 20, 25000000),
      duration: 2.0,
    })
  }, [])

  // Fly to a location
  const flyToLocation = useCallback(
    (latitude: number, longitude: number, height: number = 2000000) => {
      if (!viewerRef.current) return
      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
        duration: 2.0,
      })
    },
    [],
  )

  // Clear existing markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => {
      viewerRef.current?.entities.remove(marker)
    })
    markersRef.current.clear()
    clustersRef.current.forEach((cluster) => {
      viewerRef.current?.entities.remove(cluster)
    })
    clustersRef.current.clear()
  }, [])

  // Render news markers on the globe
  useEffect(() => {
    if (!viewerRef.current || !articles.length) return

    clearMarkers()

    const level = scope.level
    const height = getCameraHeight(viewerRef.current.camera)
    const shouldCluster = height > GLOBE_CONFIG.MARKER.CLUSTER_MIN_ZOOM

    if (shouldCluster && level === 'global') {
      const clusterMap = new Map<
        string,
        { articles: NewsArticle[]; center: { lat: number; lon: number } }
      >()

      articles.forEach((article) => {
        if (article.latitude === null || article.longitude === null) return
        const key = `${Math.round(article.latitude / 5)},${Math.round(article.longitude / 5)}`
        if (!clusterMap.has(key)) {
          clusterMap.set(key, {
            articles: [],
            center: { lat: article.latitude, lon: article.longitude },
          })
        }
        const cluster = clusterMap.get(key)!
        cluster.articles.push(article)
        cluster.center.lat =
          (cluster.center.lat * (cluster.articles.length - 1) + article.latitude) /
          cluster.articles.length
        cluster.center.lon =
          (cluster.center.lon * (cluster.articles.length - 1) + article.longitude) /
          cluster.articles.length
      })

      clusterMap.forEach((cluster, key) => {
        const clusterEntity = viewerRef.current!.entities.add({
          position: Cesium.Cartesian3.fromDegrees(
            cluster.center.lon,
            cluster.center.lat,
            0,
          ),
          billboard: {
            image: createClusterIcon(cluster.articles.length),
            width: 32,
            height: 32,
          },
          label: {
            text: String(cluster.articles.length),
            font: '12px sans-serif',
            fillColor: Cesium.Color.WHITE,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 3,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20),
          },
        })
        clustersRef.current.set(key, clusterEntity)
      })
    } else {
      articles.forEach((article) => {
        if (article.latitude === null || article.longitude === null) return

        const color =
          categoryMarkerColors[article.category] || categoryMarkerColors.politics

        const entity = viewerRef.current!.entities.add({
          id: article.id,
          position: Cesium.Cartesian3.fromDegrees(
            article.longitude,
            article.latitude,
            0,
          ),
          billboard: {
            image: createMarkerIcon(color, article.clusterId ? true : false),
            width: 14,
            height: 14,
          },
          label: {
            text:
              article.title.length > 25
                ? article.title.substring(0, 22) + '...'
                : article.title,
            font: '11px sans-serif',
            fillColor: Cesium.Color.WHITE,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -16),
            show: false,
          },
          description: article.title,
        })

        markersRef.current.set(article.id, entity)
      })
    }

    // Click handler to select markers
    const handler = new Cesium.ScreenSpaceEventHandler(
      viewerRef.current.canvas,
    )
    handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const pickedObject = viewerRef.current!.scene.pick(click.position)
      if (!pickedObject || !pickedObject.id) return

      const entity = pickedObject.id
      if (entity.id && markersRef.current.has(entity.id)) {
        const article = articles.find((a) => a.id === entity.id)
        if (article) {
          // Fly to the marker
          viewerRef.current!.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
              article.longitude!,
              article.latitude!,
              1500000,
            ),
            duration: 2.0,
          })
          setSelectedArticle(article)
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // Cleanup handler on unmount
    return () => {
      handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    }
  }, [articles, scope.level, clearMarkers, setSelectedArticle])

  // Create a colored marker icon as a data URL canvas
  const createMarkerIcon = (color: string, isCluster: boolean): string => {
    const canvas = document.createElement('canvas')
    canvas.width = 40
    canvas.height = 40
    const ctx = canvas.getContext('2d')!
    const center = 20
    const radius = isCluster ? 12 : 7

    const gradient = ctx.createRadialGradient(
      center,
      center,
      0,
      center,
      center,
      radius * 2,
    )
    gradient.addColorStop(0, color + '80')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(center, center, radius * 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(center, center, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 2
    ctx.stroke()

    return canvas.toDataURL()
  }

  const createClusterIcon = (count: number): string => {
    const canvas = document.createElement('canvas')
    canvas.width = 48
    canvas.height = 48
    const ctx = canvas.getContext('2d')!
    const center = 24

    ctx.fillStyle = '#40D9E840'
    ctx.beginPath()
    ctx.arc(center, center, 20, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#40D9E8'
    ctx.beginPath()
    ctx.arc(center, center, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = '#021014'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(count), center, center + 2)

    return canvas.toDataURL()
  }

  // Register viewer API with context
  useEffect(() => {
    if (!viewerRef.current) return
    const api = {
      resetCamera,
      flyToLocation,
    }
    registerViewer(api)
  }, [viewerRef.current, registerViewer, resetCamera, flyToLocation])

  return (
    <div
      ref={containerRef}
      className={`globe-container ${className || ''}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        background: '#05080D',
      }}
    >
      {imageryWarning && (
        <div className="imagery-warning">{imageryWarning}</div>
      )}
      {!isReady && (
        <div className="globe-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Initializing Earth...</div>
        </div>
      )}
    </div>
  )
}

export default GlobeView
