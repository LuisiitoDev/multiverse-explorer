import { useMemo } from 'react'
import { hashToUnitInterval } from '../utils/multiverseLayout'

const STAR_COUNT = 90

// Derived from the star's index rather than carried in a running seed, so each
// star is independent, the field never shifts between renders, and the
// arithmetic stays inside the safe integer range.
function generateStars(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    x: hashToUnitInterval(index * 3 + 1) * 100,
    y: hashToUnitInterval(index * 3 + 2) * 100,
    size: 0.12 + hashToUnitInterval(index * 3 + 3) * 0.3,
    delay: (index % 7) * 0.6,
  }))
}

function MultiverseStarfield() {
  const stars = useMemo(() => generateStars(STAR_COUNT), [])

  return (
    <g className="multiverse-map__stars">
      {stars.map((star) => (
        <circle
          key={star.id}
          cx={star.x}
          cy={star.y}
          r={star.size}
          style={{ animationDelay: `${star.delay}s` }}
        />
      ))}
    </g>
  )
}

export default MultiverseStarfield
