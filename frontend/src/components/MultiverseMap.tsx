import type { Location } from '../types/location'
import { getAccentClass } from '../utils/accentColor'
import { connectionsBetween, layoutNodes } from '../utils/multiverseLayout'
import MultiverseStarfield from './MultiverseStarfield'

type MultiverseMapProps = Readonly<{
  locations: Location[]
  activeLocationId: number | null
  onHoverLocation: (location: Location | null) => void
  onSelectLocation: (location: Location) => void
}>

function describeLocation(location: Location): string {
  const type = location.type || 'Unknown type'
  const dimension = location.dimension || 'Unknown dimension'
  const residents = location.residents.length

  return `${location.name}. ${type}, ${dimension}. ${residents} ${
    residents === 1 ? 'resident' : 'residents'
  }.`
}

/**
 * The map surface. Paths and stars are drawn in a decorative SVG layer, while
 * each node is a real <button> positioned on top of it -- so focus, keyboard
 * activation and accessible naming come from the platform rather than from
 * bolted-on ARIA.
 */
function MultiverseMap({
  locations,
  activeLocationId,
  onHoverLocation,
  onSelectLocation,
}: MultiverseMapProps) {
  const nodes = layoutNodes(locations)
  const connections = connectionsBetween(nodes)

  return (
    <div className="multiverse-map">
      <div className="multiverse-map__surface">
        <svg
          className="multiverse-map__canvas"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <MultiverseStarfield />

          <g className="multiverse-map__paths">
            {connections.map(([from, to]) => (
              <line
                key={`${from.x}:${from.y}-${to.x}:${to.y}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        </svg>

        <ul className="multiverse-map__nodes">
          {nodes.map(({ item: location, x, y }) => {
            const isActive = location.id === activeLocationId

            return (
              <li
                key={location.id}
                className="multiverse-map__node-slot"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <button
                  type="button"
                  className={`multiverse-node ${getAccentClass(
                    location.dimension || location.type || location.name,
                  )} ${isActive ? 'multiverse-node--active' : ''}`}
                  aria-label={describeLocation(location)}
                  aria-pressed={isActive}
                  onMouseEnter={() => onHoverLocation(location)}
                  onMouseLeave={() => onHoverLocation(null)}
                  onFocus={() => onHoverLocation(location)}
                  onBlur={() => onHoverLocation(null)}
                  onClick={() => onSelectLocation(location)}
                >
                  <span className="multiverse-node__pulse" aria-hidden="true" />
                  <span className="multiverse-node__core" aria-hidden="true" />
                  <span className="multiverse-node__label">{location.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default MultiverseMap
