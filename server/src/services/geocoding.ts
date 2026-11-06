/**
 * Geocoding service using Nominatim (OpenStreetMap)
 * 
 * Nominatim usage policy:
 *   - Max 1 request per second
 *   - Must include User-Agent with contact info
 *   - No commercial use without permission
 *   - Cache results aggressively
 */

import axios, { AxiosInstance } from 'axios'
import { CONFIG } from '../config'
import { geocodeCache } from './cache'

let lastGeoRequest = 0

const geoClient: AxiosInstance = axios.create({
  timeout: 20000,
  headers: {
    'User-Agent':
      'WORLDVIEW/1.0 (https://worldview.app; contact@worldview.app)',
    'Accept-Language': 'en',
    Referer: 'https://worldview.app/',
  },
})

const waitForRateLimit = async (): Promise<void> => {
  const now = Date.now()
  const elapsed = now - lastGeoRequest
  const minInterval = CONFIG.GEOCODING_REQUEST_INTERVAL_MS
  if (elapsed < minInterval) {
    console.log(`Geo rate limit: waiting ${minInterval - elapsed}ms`)
    await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed))
  }
  lastGeoRequest = Date.now()
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export interface GeocodeResult {
  latitude: number
  longitude: number
  displayName: string
  country: string | null
  countryCode: string | null
  region: string | null
  city: string | null
  precision: 'city' | 'region' | 'country' | 'unknown'
  confidence: number
  osmType?: string
  osmId?: string
}

export interface ReverseGeocodeResult {
  displayName: string
  country: string | null
  countryCode: string | null
  region: string | null
  city: string | null
}

const extractAddressComponents = (address: Record<string, string>): {
  country: string | null
  countryCode: string | null
  region: string | null
  city: string | null
} => {
  return {
    country: address.country || null,
    countryCode: address.country_code || null,
    region:
      address.state ||
      address.region ||
      address.province ||
      address.state_district ||
      null,
    city:
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.suburb ||
      address.county ||
      null,
  }
}

const determinePrecision = (
  address: Record<string, string>,
): 'city' | 'region' | 'country' | 'unknown' => {
  if (
    address.city ||
    address.town ||
    address.village ||
    address.municipality
  ) {
    return 'city'
  }
  if (
    address.state ||
    address.region ||
    address.province ||
    address.state_district ||
    address.county
  ) {
    return 'region'
  }
  if (address.country) {
    return 'country'
  }
  return 'unknown'
}

export const geocodeLocation = async (
  query: string,
  options: { retries?: number } = {},
): Promise<GeocodeResult | null> => {
  const { retries = 2 } = options
  const cacheKey = `geocode:${query.toLowerCase().trim()}`
  const cached = geocodeCache.get<GeocodeResult>(cacheKey)
  if (cached) {
    return cached
  }

  let lastError: unknown = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    await waitForRateLimit()

    try {
      console.log(`Geocode attempt ${attempt + 1} for "${query}"`)
      const response = await geoClient.get(CONFIG.GEOCODING_BASE, {
        params: {
          q: query,
          format: 'json',
          limit: 5,
          addressdetails: 1,
        },
      })

      const results = response.data
      console.log(`Geocode response for "${query}": ${results?.length || 0} results`)
      if (!results || results.length === 0) {
        return null
      }

      const best = results[0]
      const address = best.address || {}
      const { country, countryCode, region, city } =
        extractAddressComponents(address)
      const precision = determinePrecision(address)

      let confidence = 0.5
      if (precision === 'city') confidence = 0.85
      else if (precision === 'region') confidence = 0.7
      else if (precision === 'country') confidence = 0.5
      else confidence = 0.3

      const result: GeocodeResult = {
        latitude: parseFloat(best.lat),
        longitude: parseFloat(best.lon),
        displayName: best.display_name,
        country,
        countryCode,
        region,
        city,
        precision,
        confidence,
        osmType: best.osm_type,
        osmId: best.osm_id,
      }

      geocodeCache.set(cacheKey, result, CONFIG.CACHE_GEOCODE_TTL)
      return result
    } catch (error: unknown) {
      lastError = error
      console.error(`Geocode attempt ${attempt + 1} error for "${query}":`, error)
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1))
      }
    }
  }

  console.error(`Geocoding failed for "${query}" after ${retries + 1} attempts`)
  return null
}

export const reverseGeocode = async (
  lat: number,
  lon: number,
): Promise<ReverseGeocodeResult | null> => {
  const cacheKey = `reverse:${lat.toFixed(4)}:${lon.toFixed(4)}`
  const cached = geocodeCache.get<ReverseGeocodeResult>(cacheKey)
  if (cached) {
    return cached
  }

  await waitForRateLimit()

  try {
    const response = await geoClient.get(CONFIG.GEOCODING_REVERSE, {
      params: {
        lat,
        lon,
        format: 'json',
        addressdetails: 1,
      },
    })

    const data = response.data
    if (!data) {
      return null
    }

    const address = data.address || {}
    const result: ReverseGeocodeResult = {
      displayName: data.display_name,
      country: address.country || null,
      countryCode: address.country_code || null,
      region:
        address.state ||
        address.region ||
        address.province ||
        null,
      city:
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        null,
    }

    geocodeCache.set(cacheKey, result, CONFIG.CACHE_GEOCODE_TTL)
    return result
  } catch (error: unknown) {
    console.error(`Reverse geocoding error for ${lat},${lon}:`, error)
    return null
  }
}

export const geocodeBatch = async (
  queries: string[],
): Promise<Map<string, GeocodeResult | null>> => {
  const results = new Map<string, GeocodeResult | null>()

  for (const query of queries) {
    const result = await geocodeLocation(query)
    results.set(query, result)
  }

  return results
}
