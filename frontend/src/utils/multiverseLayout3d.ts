import { hashToUnitInterval } from './multiverseLayout'

/**
 * Deterministic 3D placement for the 3D map. Like the 2D layout, positions come
 * only from the location id and its index, so a location always lands in the
 * same spot. Points follow a Fibonacci sphere with a small per-id radial jitter.
 */
export type Position3d = {
  x: number
  y: number
  z: number
}

export type MapNode3d<TItem> = Position3d & {
  item: TItem
}

const GOLDEN_ANGLE_RADIANS = Math.PI * (3 - Math.sqrt(5))
const BASE_RADIUS = 10
const RADIUS_JITTER = 2.5

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function positionForNode3d(id: number, index: number, total: number): Position3d {
  const safeTotal = Math.max(total, 1)
  const y = 1 - ((index + 0.5) / safeTotal) * 2
  const ring = Math.sqrt(1 - y * y)
  const angle = index * GOLDEN_ANGLE_RADIANS
  const radius = BASE_RADIUS + (hashToUnitInterval(id) - 0.5) * RADIUS_JITTER

  return {
    x: roundTo(Math.cos(angle) * ring * radius),
    y: roundTo(y * radius),
    z: roundTo(Math.sin(angle) * ring * radius),
  }
}

export function layoutNodes3d<TItem extends { id: number }>(items: TItem[]): MapNode3d<TItem>[] {
  return items.map((item, index) => ({
    item,
    ...positionForNode3d(item.id, index, items.length),
  }))
}
