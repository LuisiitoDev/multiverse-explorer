import { describe, expect, it } from 'vitest'
import {
  connectionsBetween,
  hashToUnitInterval,
  layoutNodes,
  positionForNode,
} from './multiverseLayout'

describe('hashToUnitInterval', () => {
  it('is deterministic', () => {
    expect(hashToUnitInterval(42)).toBe(hashToUnitInterval(42))
  })

  it('stays inside [0, 1)', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const value = hashToUnitInterval(seed)

      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('stays finite for seeds beyond the safe integer range', () => {
    for (const seed of [0, 1, 137, 2 ** 20, 2 ** 31 - 1, Number.MAX_SAFE_INTEGER]) {
      expect(Number.isFinite(hashToUnitInterval(seed))).toBe(true)
    }
  })

  it('spreads seeds across the range instead of clustering', () => {
    const buckets = new Set(
      Array.from({ length: 200 }, (_, seed) => Math.floor(hashToUnitInterval(seed) * 10)),
    )

    expect(buckets.size).toBe(10)
  })

  it('gives neighbouring seeds unrelated values', () => {
    expect(Math.abs(hashToUnitInterval(1) - hashToUnitInterval(2))).toBeGreaterThan(0.01)
  })
})

const locations = [
  { id: 1, name: 'Earth (C-137)' },
  { id: 20, name: 'Abadango' },
  { id: 3, name: 'Citadel of Ricks' },
]

describe('positionForNode', () => {
  it('is deterministic for the same inputs', () => {
    expect(positionForNode(42, 3, 20)).toEqual(positionForNode(42, 3, 20))
  })

  it('gives different positions to different indexes', () => {
    expect(positionForNode(1, 0, 10)).not.toEqual(positionForNode(1, 1, 10))
  })

  it('separates two locations that share an index but not an id', () => {
    expect(positionForNode(1, 0, 10)).not.toEqual(positionForNode(2, 0, 10))
  })

  it('keeps every node inside the map surface', () => {
    for (let index = 0; index < 40; index += 1) {
      const { x, y } = positionForNode(index * 7 + 1, index, 40)

      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(100)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(100)
    }
  })

  it('survives a single-node page without dividing by zero', () => {
    const { x, y } = positionForNode(1, 0, 1)

    expect(Number.isFinite(x)).toBe(true)
    expect(Number.isFinite(y)).toBe(true)
  })
})

describe('layoutNodes', () => {
  it('preserves order and attaches a position to each item', () => {
    const nodes = layoutNodes(locations)

    expect(nodes.map((node) => node.item.name)).toEqual([
      'Earth (C-137)',
      'Abadango',
      'Citadel of Ricks',
    ])
    nodes.forEach((node) => {
      expect(typeof node.x).toBe('number')
      expect(typeof node.y).toBe('number')
    })
  })

  it('produces identical output across repeated calls', () => {
    expect(layoutNodes(locations)).toEqual(layoutNodes(locations))
  })

  it('handles an empty page', () => {
    expect(layoutNodes([])).toEqual([])
  })
})

describe('connectionsBetween', () => {
  it('gives every node after the first exactly one edge', () => {
    const nodes = layoutNodes(locations)
    const connections = connectionsBetween(nodes)

    expect(connections).toHaveLength(nodes.length - 1)
    connections.forEach(([, to], index) => {
      expect(to).toBe(nodes[index + 1])
    })
  })

  it('always links back to an already-placed node, keeping the figure connected', () => {
    const nodes = layoutNodes(
      Array.from({ length: 20 }, (_, index) => ({ id: index * 3 + 1 })),
    )

    connectionsBetween(nodes).forEach(([from], index) => {
      const placedAt = nodes.findIndex((node) => node.x === from.x && node.y === from.y)

      expect(placedAt).toBeGreaterThanOrEqual(0)
      expect(placedAt).toBeLessThanOrEqual(index)
    })
  })

  it('prefers the nearest earlier node over the previous one', () => {
    const nodes = layoutNodes(Array.from({ length: 12 }, (_, index) => ({ id: index + 1 })))
    const connections = connectionsBetween(nodes)

    connections.forEach(([from], offset) => {
      const target = nodes[offset + 1]
      const distanceTo = (node: { x: number; y: number }) =>
        (node.x - target.x) ** 2 + (node.y - target.y) ** 2

      nodes.slice(0, offset + 1).forEach((candidate) => {
        expect(distanceTo(from)).toBeLessThanOrEqual(distanceTo(candidate))
      })
    })
  })

  it('returns nothing when there is fewer than one pair', () => {
    expect(connectionsBetween(layoutNodes([{ id: 1 }]))).toEqual([])
    expect(connectionsBetween(layoutNodes([]))).toEqual([])
  })
})
