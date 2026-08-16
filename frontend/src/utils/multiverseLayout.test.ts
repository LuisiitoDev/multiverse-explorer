import { describe, expect, it } from 'vitest'
import { connectionsBetween, layoutNodes, positionForNode } from './multiverseLayout'

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
  it('chains consecutive nodes', () => {
    const nodes = layoutNodes(locations)
    const connections = connectionsBetween(nodes)

    expect(connections).toHaveLength(2)
    expect(connections[0][0]).toBe(nodes[0])
    expect(connections[0][1]).toBe(nodes[1])
    expect(connections[1][0]).toBe(nodes[1])
    expect(connections[1][1]).toBe(nodes[2])
  })

  it('returns nothing when there is fewer than one pair', () => {
    expect(connectionsBetween(layoutNodes([{ id: 1 }]))).toEqual([])
    expect(connectionsBetween(layoutNodes([]))).toEqual([])
  })
})
