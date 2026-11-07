/**
 * Globe configuration and constants
 */
/// <reference types="vite/client" />

export const GLOBE_CONFIG = {
  // Imagery providers - fallback chain, no paid token required
  IMAGERY_PROVIDERS: {
    BING: {
      enabled: !!import.meta.env.VITE_BING_MAPS_KEY,
      key: import.meta.env.VITE_BING_MAPS_KEY || '',
    },
    // Esri World Imagery - free, no token required
    ESRI_WORLD: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
      tileUrl:
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
    // Natural Earth II - fallback, no token required
    NATURAL_EARTH: {
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer',
      attribution: 'Esri, HERE, Garmin',
    },
    // OpenStreetMap - fallback
    OPEN_STREET_MAP: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
    },
  },

  // Terrain provider
  TERRAIN: {
    // Cesium World Terrain - free tier
    ENABLED: true,
    URL: 'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles',
  },

  // Camera settings
  CAMERA: {
    DEFAULT_POSITION: {
      longitude: 0,
      latitude: 20,
      height: 25000000,
    },
    MIN_ZOOM_HEIGHT: 5000,
    MAX_ZOOM_HEIGHT: 50000000,
    FLY_DURATION: 3.0,
  },

  // Auto rotation
  AUTO_ROTATION: {
    ENABLED: true,
    SPEED: 0.0001, // degrees per frame
  },

  // Marker styling
  MARKER: {
    BASE_SIZE: 10,
    PULSE_DURATION: 2.0,
    CLUSTER_MIN_ZOOM: 3000000, // below this height, cluster
  },
}

export const categoryMarkerColors: Record<string, string> = {
  politics: '#438BFF',
  conflict: '#FF4D4D',
  business: '#4CAF50',
  technology: '#40D9E8',
  science: '#8B5CF6',
  climate: '#14B8A6',
  disaster: '#FB923C',
  sports: '#EAB308',
  culture: '#EC4899',
  health: '#6366F1',
}
