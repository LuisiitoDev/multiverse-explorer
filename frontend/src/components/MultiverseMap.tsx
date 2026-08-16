import { useEffect, useRef, useState } from 'react'
import type { Location } from '../types/location'
import { getAccentClass } from '../utils/accentColor'
import { connectionsBetween, layoutNodes } from '../utils/multiverseLayout'
import MultiverseStarfield from './MultiverseStarfield'

type MultiverseMapProps = Readonly<{
  locations: Location[]
  activeLocationId: number | null
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
  onSelectLocation,
}: MultiverseMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const nodes = layoutNodes(locations)
  const connections = connectionsBetween(nodes)

  useEffect(() => {
    const map = mapRef.current

    if (!map) {
      return
    }

    map.scrollLeft = (map.scrollWidth - map.clientWidth) / 2
    map.scrollTop = (map.scrollHeight - map.clientHeight) / 2
  }, [locations.length])

  return (
    <div className="multiverse-map" ref={mapRef}>
      <div className="multiverse-map__controls" aria-label="Map controls">
        <button
          type="button"
          className="multiverse-map__control"
          aria-label="Zoom in"
          onClick={() => setZoom((current) => Math.min(current + 0.25, 2.5))}
          disabled={zoom >= 2.5}
        >
          +
        </button>
        <span className="multiverse-map__zoom-level" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className="multiverse-map__control"
          aria-label="Zoom out"
          onClick={() => setZoom((current) => Math.max(current - 0.25, 0.5))}
          disabled={zoom <= 0.5}
        >
          -
        </button>
        <button
          type="button"
          className="multiverse-map__control multiverse-map__control--reset"
          aria-label="Reset map zoom"
          onClick={() => setZoom(1)}
          disabled={zoom === 1}
        >
          1:1
        </button>
      </div>

      <div
        className="multiverse-map__surface"
        style={{ width: `${2200 * zoom}px`, height: `${1400 * zoom}px` }}
      >
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
                  aria-describedby={`location-tooltip-${location.id}`}
                  aria-pressed={isActive}
                  onClick={() => onSelectLocation(location)}
                >
                  <span className="multiverse-node__pulse" aria-hidden="true" />
                  <span className="multiverse-node__core" aria-hidden="true" />
                  <span className="multiverse-node__label">{location.name}</span>
                  <span
                    className="multiverse-node__tooltip"
                    id={`location-tooltip-${location.id}`}
                    role="tooltip"
                  >
                    <strong>{location.name}</strong>
                    <span>{location.type || 'Unknown type'}</span>
                    <span>{location.dimension || 'Unknown dimension'}</span>
                    <span>
                      {location.residents.length}{' '}
                      {location.residents.length === 1 ? 'resident' : 'residents'}
                    </span>
                  </span>
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
