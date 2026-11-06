/**
 * Camera position utilities for globe navigation
 */

import * as Cesium from 'cesium'

export const degreesToRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180
}

export const radiansToDegrees = (radians: number): number => {
  return (radians * 180) / Math.PI
}

export const getCameraHeight = (camera: Cesium.Camera): number => {
  const position = camera.positionCartographic
  return position.height
}

export const getCameraPosition = (camera: Cesium.Camera): {
  longitude: number
  latitude: number
  height: number
} => {
  const position = camera.positionCartographic
  return {
    longitude: Cesium.Math.toDegrees(position.longitude),
    latitude: Cesium.Math.toDegrees(position.latitude),
    height: position.height,
  }
}

export const getViewportBounds = (
  viewer: Cesium.Viewer,
): { west: number; south: number; east: number; north: number } => {
  const canvas = viewer.canvas
  const camera = viewer.camera

  const corners = [
    new Cesium.Cartesian2(0, 0),
    new Cesium.Cartesian2(canvas.clientWidth, 0),
    new Cesium.Cartesian2(canvas.clientWidth, canvas.clientHeight),
    new Cesium.Cartesian2(0, canvas.clientHeight),
  ]

  const positions = corners.map((corner) => {
    const ray = camera.getPickRay(corner)
    if (!ray) {
      return { longitude: 0, latitude: 0 }
    }
    const position = viewer.scene.globe.pick(ray, viewer.scene)
    if (!position) {
      return { longitude: 0, latitude: 0 }
    }
    const cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position)
    return {
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
    }
  })

  const longitudes = corners.map((_, i) => positions[i].longitude)
  const latitudes = corners.map((_, i) => positions[i].latitude)

  return {
    west: Math.min(...longitudes),
    south: Math.min(...latitudes),
    east: Math.max(...longitudes),
    north: Math.max(...latitudes),
  }
}

export const getDetailLevel = (
  height: number,
): 'global' | 'continent' | 'country' | 'city' => {
  if (height > 20000000) return 'global'
  if (height > 6000000) return 'continent'
  if (height > 1500000) return 'country'
  return 'city'
}
