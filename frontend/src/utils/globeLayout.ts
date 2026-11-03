export type GlobePoint = { lat: number; lon: number }

const GOLDEN_ANGLE_DEG = 137.50776405003785
const MAX_LAT = 80

/**
 * Deterministic position from the location id only. A golden-angle spiral
 * spreads consecutive ids evenly; non-finite or non-integer ids are coerced
 * so the result is always a valid latitude/longitude.
 */
export function locationToGlobePoint(id: number): GlobePoint {
  const safeId = Number.isFinite(id) ? Math.abs(Math.trunc(id)) : 0
  const t = (((safeId * 0.6180339887498949) % 1) * 2 - 1) * Math.sin(MAX_LAT * (Math.PI / 180))
  const lat = Math.asin(t) * (180 / Math.PI)
  const lon = ((safeId * GOLDEN_ANGLE_DEG) % 360) - 180

  return { lat, lon }
}

export function latLonToVector3(
  lat: number,
  lon: number,
  radius = 1,
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)

  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ]
}
