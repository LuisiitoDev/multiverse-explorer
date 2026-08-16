/**
 * Deterministic node placement for the Multiverse Map.
 *
 * The API gives no coordinates, so positions are generated from the location's
 * id and its index in the page. Both inputs are stable for a given page, so a
 * location always lands in the same spot -- no randomness, no drift between
 * renders.
 *
 * The arrangement is a phyllotaxis (sunflower) spiral: each node is one golden
 * angle further round than the last, with the radius growing as sqrt(index).
 * That combination spreads points evenly without them colliding or forming
 * visible spokes, which is exactly what a hand-placed star map needs.
 */

/** Positions are percentages of the map surface, so the SVG and the DOM agree. */
export type MapPosition = {
  x: number
  y: number
}

export type MapNode<TItem> = MapPosition & {
  item: TItem
}

// ~137.5deg, the angle that makes consecutive points interleave rather than align.
const GOLDEN_ANGLE_RADIANS = Math.PI * (3 - Math.sqrt(5))

const CENTRE = 50
// Kept under 50 so glow and labels stay inside the map surface.
const MAX_RADIUS_X = 42
const MAX_RADIUS_Y = 38
// Pushes the first node off dead centre so the middle of the map is not crowded.
const INNER_OFFSET = 0.35

/** Small stable per-id variation so the spiral does not look mechanical. */
function jitterFromId(id: number): number {
  return ((id * 2654435761) % 1000) / 1000 - 0.5
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function positionForNode(id: number, index: number, total: number): MapPosition {
  const safeTotal = Math.max(total, 1)
  const angle = index * GOLDEN_ANGLE_RADIANS + jitterFromId(id) * 0.35
  const distance = Math.sqrt((index + INNER_OFFSET) / safeTotal)

  return {
    x: roundTo(CENTRE + Math.cos(angle) * distance * MAX_RADIUS_X),
    y: roundTo(CENTRE + Math.sin(angle) * distance * MAX_RADIUS_Y),
  }
}

/** Places a page of items, preserving their order. */
export function layoutNodes<TItem extends { id: number }>(items: TItem[]): MapNode<TItem>[] {
  return items.map((item, index) => ({
    item,
    ...positionForNode(item.id, index, items.length),
  }))
}

function squaredDistanceBetween(a: MapPosition, b: MapPosition): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2
}

/**
 * Links each node to the nearest of the nodes placed before it, producing a
 * connected constellation rather than scattered dots.
 *
 * Chaining nodes in spiral order instead would be simpler, but consecutive
 * points on a phyllotaxis spiral are far apart, so the map ends up webbed with
 * long crossing lines. Nearest-earlier-neighbour keeps every edge short while
 * still guaranteeing a single connected figure with exactly one edge per node
 * after the first.
 */
export function connectionsBetween<TItem>(nodes: MapNode<TItem>[]): [MapPosition, MapPosition][] {
  return nodes.slice(1).map((node, offset): [MapPosition, MapPosition] => {
    const placed = nodes.slice(0, offset + 1)
    const nearest = placed.reduce((closest, candidate) =>
      squaredDistanceBetween(candidate, node) < squaredDistanceBetween(closest, node)
        ? candidate
        : closest,
    )

    return [nearest, node]
  })
}
