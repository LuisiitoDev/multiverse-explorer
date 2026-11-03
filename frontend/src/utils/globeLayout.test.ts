import { describe, expect, it } from 'vitest'
import { latLonToVector3, locationToGlobePoint } from './globeLayout'

describe('locationToGlobePoint', () => {
  it('is deterministic', () => {
    expect(locationToGlobePoint(42)).toEqual(locationToGlobePoint(42))
  })

  it('stays within valid latitude and longitude bounds', () => {
    for (let id = 0; id < 500; id += 1) {
      const { lat, lon } = locationToGlobePoint(id)
      expect(lat).toBeGreaterThanOrEqual(-90)
      expect(lat).toBeLessThanOrEqual(90)
      expect(lon).toBeGreaterThanOrEqual(-180)
      expect(lon).toBeLessThanOrEqual(180)
    }
  })

  it('gives distinct ids distinct positions', () => {
    const seen = new Set<string>()
    for (let id = 1; id <= 126; id += 1) {
      const { lat, lon } = locationToGlobePoint(id)
      seen.add(`${lat.toFixed(4)},${lon.toFixed(4)}`)
    }
    expect(seen.size).toBe(126)
  })

  it.each([[0], [-5], [NaN], [Infinity], [3.7], [Number.MAX_SAFE_INTEGER]])(
    'never yields NaN for id %s',
    (id) => {
      const { lat, lon } = locationToGlobePoint(id)
      expect(Number.isFinite(lat)).toBe(true)
      expect(Number.isFinite(lon)).toBe(true)
    },
  )
})

describe('latLonToVector3', () => {
  it('returns points on the unit sphere', () => {
    for (let id = 0; id < 100; id += 1) {
      const { lat, lon } = locationToGlobePoint(id)
      const [x, y, z] = latLonToVector3(lat, lon)
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 10)
    }
  })

  it('maps the poles to the vertical axis', () => {
    const [x, y, z] = latLonToVector3(90, 0)
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(1)
    expect(z).toBeCloseTo(0)
  })

  it('scales with the radius', () => {
    const [x, y, z] = latLonToVector3(10, 20, 2)
    expect(Math.hypot(x, y, z)).toBeCloseTo(2, 10)
  })
})
