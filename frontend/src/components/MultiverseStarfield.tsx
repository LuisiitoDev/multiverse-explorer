import { useMemo } from 'react'

// Generated once from a fixed seed so the starfield never shifts between
// renders -- the same reason node positions are deterministic.
function generateStars(count: number) {
  let seed = 137

  return Array.from({ length: count }, (_, index) => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    const x = (seed / 2147483648) * 100
    seed = (seed * 1103515245 + 12345) % 2147483648
    const y = (seed / 2147483648) * 100
    seed = (seed * 1103515245 + 12345) % 2147483648
    const size = 0.12 + (seed / 2147483648) * 0.3

    return { id: index, x, y, size, delay: (index % 7) * 0.6 }
  })
}

function MultiverseStarfield() {
  const stars = useMemo(() => generateStars(90), [])

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
