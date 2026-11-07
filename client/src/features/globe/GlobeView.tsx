import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import { useNewsStore } from '@/features/news/news.store'
import {
  GLOBE_CONFIG,
  categoryMarkerColors,
} from '@/features/globe/globe.config'
import {
  getDetailLevel,
  getCameraPosition,
  getCameraHeight,
} from '@/features/globe/camera.utils'
import { apiClient } from '@/services/api.client'
import { useGlobeRef } from '@/features/globe/globe.context'
import type { NewsArticle } from '@/features/news/news.types'

interface GlobeViewProps {
  className?: string
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

function applyFilters(
  articles: NewsArticle[],
  category: string | null,
  timeRange: string | null,
  searchQuery: string,
): NewsArticle[] {
  let list = articles

  if (category && category !== 'all' && category !== 'breaking') {
    list = list.filter((article) => article.category === category)
  }

  if (timeRange) {
    const windows: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }
    const windowMs = windows[timeRange]
    if (windowMs) {
      const cutoff = Date.now() - windowMs
      list = list.filter(
        (article) => new Date(article.publishedAt).getTime() >= cutoff,
      )
    }
  }

  const query = searchQuery.trim().toLowerCase()
  if (query) {
    const terms = query.split(/\s+/).filter((term) => term.length > 1)
    list = list.filter((article) => {
      const haystack = `${article.title} ${article.summary} ${article.city} ${article.country} ${article.source}`.toLowerCase()
      return terms.every((term) => haystack.includes(term))
    })
  }

  return list
}

const GlobeView: React.FC<GlobeViewProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const interactionRef = useRef(false)
  const rotationEnabledRef = useRef(GLOBE_CONFIG.AUTO_ROTATION.ENABLED)

  const {
    setArticles,
    setVisibleArticles,
    setScope,
    setSelectedArticle,
    setLastUpdated,
    setLoading,
    setError,
    clearError,
    filters,
    scope,
    articles,
  } = useNewsStore()

  const { registerViewer } = useGlobeRef()

  const [isReady, setIsReady] = useState(false)
  const [imageryWarning, setImageryWarning] = useState<string | null>(null)
  const markersRef = useRef<Map<string, Cesium.Entity>>(new Map())
  const clustersRef = useRef<Map<string, Cesium.Entity>>(new Map())
  const clusterCentersRef = useRef<Map<string, { lat: number; lon: number }>>(new Map())
  const articlesRef = useRef<NewsArticle[]>([])
  const mountedRef = useRef(true)

  const filteredArticles = useMemo(
    () => applyFilters(articles, filters.category, filters.timeRange, filters.searchQuery),
    [articles, filters.category, filters.timeRange, filters.searchQuery],
  )

  articlesRef.current = filteredArticles

  /* ---------------------------------------------------------------- */
  /* Initialise Cesium                                                 */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    mountedRef.current = true
    if (!containerRef.current) return

    let viewer: Cesium.Viewer | null = null

    try {
      viewer = new Cesium.Viewer(containerRef.current, {
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

      viewerRef.current = viewer
      ;(window as unknown as { __globeViewer?: Cesium.Viewer }).__globeViewer = viewer

      const { longitude, latitude, height } = GLOBE_CONFIG.CAMERA.DEFAULT_POSITION
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
        orientation: {
          heading: 0,
          pitch: -Cesium.Math.PI_OVER_TWO,
          roll: 0,
        },
      })

      viewer.imageryLayers.removeAll()
      try {
        const satelliteLayer = viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: GLOBE_CONFIG.IMAGERY_PROVIDERS.ESRI_WORLD.tileUrl,
            credit: new Cesium.Credit(
              GLOBE_CONFIG.IMAGERY_PROVIDERS.ESRI_WORLD.attribution,
            ),
            maximumLevel: 18,
          }),
        )
        // Cinematic grade: darker, slightly contrasty satellite imagery so the
        // cyan telemetry layer always reads clearly.
        satelliteLayer.brightness = 0.58
        satelliteLayer.contrast = 1.18
        satelliteLayer.saturation = 0.72
        satelliteLayer.gamma = 1.05
      } catch {
        viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: GLOBE_CONFIG.IMAGERY_PROVIDERS.OPEN_STREET_MAP.url,
            credit: new Cesium.Credit(
              GLOBE_CONFIG.IMAGERY_PROVIDERS.OPEN_STREET_MAP.attribution,
            ),
            maximumLevel: 18,
          }),
        )
      }

      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#04070b')
      viewer.scene.globe.enableLighting = false
      viewer.scene.globe.depthTestAgainstTerrain = false
      viewer.scene.globe.showGroundAtmosphere = true

      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.show = true
      }

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

      // Terrain is a nice-to-have. Never let it block the globe.
      Cesium.createWorldTerrainAsync()
        .then((terrainProvider) => {
          const activeViewer = viewerRef.current
          if (activeViewer && activeViewer === viewer) {
            activeViewer.terrainProvider = terrainProvider
          }
        })
        .catch(() => {})
    } catch (error) {
      setError(
        `Failed to initialize 3D globe: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }

    setIsReady(true)
    clearError()

    return () => {
      mountedRef.current = false
      if (viewer) {
        viewer.destroy()
      }
      viewerRef.current = null
      ;(window as unknown as { __globeViewer?: Cesium.Viewer }).__globeViewer = undefined
    }
  }, [clearError, setError])

  /* ---------------------------------------------------------------- */
  /* Load global news and refresh periodically                         */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const response = await apiClient.getNews({
          timespan: '24h',
          maxRecords: 250,
        })

        if (cancelled) return

        if (response.success && Array.isArray(response.data)) {
          setArticles(response.data)
          setLastUpdated(response.timestamp || new Date().toISOString())
          clearError()
        } else {
          setError(response.warning || 'News feed returned no data')
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error ? error.message : 'Unable to reach the news service',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [setArticles, setLastUpdated, setLoading, setError, clearError])

  /* Keep the right-hand panel list in sync with active filters */
  useEffect(() => {
    setVisibleArticles(filteredArticles)
  }, [filteredArticles, setVisibleArticles])

  /* ---------------------------------------------------------------- */
  /* Auto rotation, paused while the user interacts                    */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!viewerRef.current) return

    const viewer = viewerRef.current
    const start = () => {
      interactionRef.current = true
    }
    const end = () => {
      interactionRef.current = false
    }

    const handler = viewer.screenSpaceEventHandler
    handler.setInputAction(start, Cesium.ScreenSpaceEventType.LEFT_DOWN)
    handler.setInputAction(start, Cesium.ScreenSpaceEventType.RIGHT_DOWN)
    handler.setInputAction(start, Cesium.ScreenSpaceEventType.MIDDLE_DOWN)
    handler.setInputAction(start, Cesium.ScreenSpaceEventType.WHEEL)
    handler.setInputAction(end, Cesium.ScreenSpaceEventType.LEFT_UP)
    handler.setInputAction(end, Cesium.ScreenSpaceEventType.RIGHT_UP)
    handler.setInputAction(end, Cesium.ScreenSpaceEventType.MIDDLE_UP)

    const rotate = () => {
      if (interactionRef.current || !rotationEnabledRef.current) return
      viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, -GLOBE_CONFIG.AUTO_ROTATION.SPEED)
    }

    viewer.clock.onTick.addEventListener(rotate)

    return () => {
      viewer.clock.onTick.removeEventListener(rotate)
    }
  }, [])

  /* ---------------------------------------------------------------- */
  /* Scope tracking (zoom-based detail levels)                          */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!viewerRef.current) return
    const viewer = viewerRef.current
    let timer: ReturnType<typeof setTimeout> | null = null

    const updateScope = () => {
      const height = getCameraHeight(viewer.camera)
      const level = getDetailLevel(height)
      const position = getCameraPosition(viewer.camera)

      setScope({
        level,
        center: { lat: position.latitude, lon: position.longitude },
        bounds: null,
        name: level.charAt(0).toUpperCase() + level.slice(1),
        countryCode: null,
      })
    }

    const onMove = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(updateScope, 250)
    }

    viewer.camera.moveEnd.addEventListener(onMove)
    viewer.camera.changed.addEventListener(onMove)

    return () => {
      viewer.camera.moveEnd.removeEventListener(onMove)
      viewer.camera.changed.removeEventListener(onMove)
      if (timer) clearTimeout(timer)
    }
  }, [setScope])

  /* ---------------------------------------------------------------- */
  /* Viewer API for the controls                                       */
  /* ---------------------------------------------------------------- */

  const resetCamera = React.useCallback(() => {
    if (!viewerRef.current) return
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(0, 20, 25000000),
      duration: 2,
    })
  }, [])

  const flyToLocation = React.useCallback(
    (latitude: number, longitude: number, height = 1800000) => {
      if (!viewerRef.current) return
      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
        duration: 2,
      })
    },
    [],
  )

  const toggleRotation = React.useCallback(() => {
    rotationEnabledRef.current = !rotationEnabledRef.current
    return rotationEnabledRef.current
  }, [])

  useEffect(() => {
    registerViewer({ resetCamera, flyToLocation, toggleRotation })
  }, [registerViewer, resetCamera, flyToLocation, toggleRotation])

  /* ---------------------------------------------------------------- */
  /* Markers                                                           */
  /* ---------------------------------------------------------------- */

  const clearMarkers = React.useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    markersRef.current.forEach((entity) => viewer.entities.remove(entity))
    clustersRef.current.forEach((entity) => viewer.entities.remove(entity))
    markersRef.current.clear()
    clustersRef.current.clear()
    clusterCentersRef.current.clear()
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    clearMarkers()

    const list = filteredArticles.filter(
      (article) => article.latitude !== null && article.longitude !== null,
    )

    if (!list.length) return

    const height = getCameraHeight(viewer.camera)
    const clusterMode = height > GLOBE_CONFIG.MARKER.CLUSTER_MIN_ZOOM

    if (clusterMode) {
      const buckets = new Map<
        string,
        { articles: NewsArticle[]; lat: number; lon: number }
      >()

      for (const article of list) {
        const key = `${Math.round(article.latitude! / 8)},${Math.round(article.longitude! / 8)}`
        const bucket = buckets.get(key)
        if (bucket) {
          bucket.articles.push(article)
          bucket.lat += (article.latitude! - bucket.lat) / bucket.articles.length
          bucket.lon += (article.longitude! - bucket.lon) / bucket.articles.length
        } else {
          buckets.set(key, {
            articles: [article],
            lat: article.latitude!,
            lon: article.longitude!,
          })
        }
      }

      buckets.forEach((bucket, key) => {
        const entity = viewer.entities.add({
          id: `cluster:${key}`,
          position: Cesium.Cartesian3.fromDegrees(bucket.lon, bucket.lat, 0),
          billboard: {
            image: createClusterIcon(bucket.articles.length),
            width: 46,
            height: 46,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        })
        clusterCentersRef.current.set(`cluster:${key}`, {
          lat: bucket.lat,
          lon: bucket.lon,
        })
        clustersRef.current.set(key, entity)
      })
    } else {
      for (const article of list) {
        const color =
          categoryMarkerColors[article.category] || categoryMarkerColors.politics

        const entity = viewer.entities.add({
          id: article.id,
          position: Cesium.Cartesian3.fromDegrees(
            article.longitude!,
            article.latitude!,
            0,
          ),
          billboard: {
            image: createMarkerIcon(color, article.locationPrecision === 'country'),
            width: article.locationPrecision === 'country' ? 11 : 16,
            height: article.locationPrecision === 'country' ? 11 : 16,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text:
              article.title.length > 34
                ? `${article.title.slice(0, 31)}...`
                : article.title,
            font: '11px "IBM Plex Sans", sans-serif',
            fillColor: Cesium.Color.WHITE,
            showBackground: true,
            backgroundColor: new Cesium.Color(0.02, 0.05, 0.08, 0.82),
            backgroundPadding: new Cesium.Cartesian2(6, 4),
            style: Cesium.LabelStyle.FILL,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            show: false,
          },
          description: article.title,
        })

        markersRef.current.set(article.id, entity)
      }
    }
  }, [filteredArticles, isReady, scope.level, clearMarkers])

  /* ---------------------------------------------------------------- */
  /* Click + hover interaction                                         */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)

    handler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const picked = viewer.scene.pick(click.position)
        if (!picked || !picked.id) return
        const entity = picked.id as Cesium.Entity
        const id = String(entity.id)

        if (id.startsWith('cluster:')) {
          const center = clusterCentersRef.current.get(id)
          if (center) {
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(center.lon, center.lat, 2200000),
              duration: 1.8,
            })
          }
          return
        }

        const article = articlesRef.current.find((item) => item.id === id)
        if (article && article.latitude !== null && article.longitude !== null) {
          setSelectedArticle(article)
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
              article.longitude,
              article.latitude,
              1400000,
            ),
            duration: 1.8,
          })
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    )

    handler.setInputAction(
      (movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        const picked = viewer.scene.pick(movement.endPosition)
        const hoveredId = picked && picked.id ? String((picked.id as Cesium.Entity).id) : null

        markersRef.current.forEach((entity, id) => {
          if (!entity.label) return
          entity.label.show = new Cesium.ConstantProperty(id === hoveredId)
        })

        viewer.canvas.style.cursor =
          picked && picked.id && (hoveredId?.startsWith('cluster:') || markersRef.current.has(hoveredId || ''))
            ? 'pointer'
            : 'default'
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE,
    )

    return () => {
      handler.destroy()
    }
  }, [isReady, setSelectedArticle])

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
      {imageryWarning && <div className="imagery-warning">{imageryWarning}</div>}
      {!isReady && (
        <div className="globe-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Initializing Earth...</div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Canvas icons                                                        */
/* ------------------------------------------------------------------ */

function createMarkerIcon(color: string, muted = false): string {
  const canvas = document.createElement('canvas')
  canvas.width = 40
  canvas.height = 40
  const ctx = canvas.getContext('2d')!
  const center = 20
  const radius = muted ? 5 : 7

  const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius * 3)
  gradient.addColorStop(0, `${color}90`)
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(center, center, radius * 3, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255,255,255,0.92)'
  ctx.lineWidth = 2
  ctx.stroke()

  return canvas.toDataURL()
}

function createClusterIcon(count: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = 56
  canvas.height = 56
  const ctx = canvas.getContext('2d')!
  const center = 28

  const glow = ctx.createRadialGradient(center, center, 0, center, center, 28)
  glow.addColorStop(0, 'rgba(64,217,232,0.35)')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(center, center, 28, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(6,20,26,0.92)'
  ctx.beginPath()
  ctx.arc(center, center, 18, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#40D9E8'
  ctx.lineWidth = 2.5
  ctx.stroke()

  ctx.fillStyle = '#CFFAFF'
  ctx.font = 'bold 15px "IBM Plex Sans", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(count), center, center + 1)

  return canvas.toDataURL()
}

export default GlobeView
