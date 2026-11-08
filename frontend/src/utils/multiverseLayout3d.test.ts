import { describe, expect, it } from 'vitest'
import { layoutNodes3d, positionForNode3d } from './multiverseLayout3d'

const items = [{ id: 3 }, { id: 1 }, { id: 9 }, { id: 27 }]

describe('layoutNodes3d', () => {
  it('returns identical positions for identical input', () => {
    expect(layoutNodes3d(items)).toEqual(layoutNodes3d(items))
  })

  it('returns one node per location, in order', () => {
    const nodes = layoutNodes3d(items)

    expect(nodes.map((node) => node.item.id)).toEqual([3, 1, 9, 27])
  })

  it('produces finite coordinates rounded to two decimals', () => {
    for (const node of layoutNodes3d(items)) {
      for (const value of [node.x, node.y, node.z]) {
        expect(Number.isFinite(value)).toBe(true)
        expect(Math.round(value * 100) / 100).toBe(value)
      }
    }
  })

  it('gives distinct positions to distinct nodes', () => {
    const keys = layoutNodes3d(items).map(({ x, y, z }) => `${x}:${y}:${z}`)

    expect(new Set(keys).size).toBe(items.length)
  })

  it('handles an empty list and a zero total', () => {
    expect(layoutNodes3d([])).toEqual([])
    expect(Number.isFinite(positionForNode3d(1, 0, 0).y)).toBe(true)
  })
})
