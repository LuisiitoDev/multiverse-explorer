import type { Location } from '../types/location'

type MultiverseReadoutProps = Readonly<{
  location: Location | null
}>

/**
 * The holographic status strip under the map. It mirrors whatever node is
 * hovered *or* focused, so the same information is available to a pointer and
 * to a keyboard -- hover is never the only way to read a node.
 */
function MultiverseReadout({ location }: MultiverseReadoutProps) {
  if (!location) {
    return (
      <div className="multiverse-readout multiverse-readout--idle" role="status" aria-live="polite">
        <p className="multiverse-readout__hint">Hover or select a location</p>
      </div>
    )
  }

  return (
    <div className="multiverse-readout" role="status" aria-live="polite">
      <p className="multiverse-readout__name">{location.name}</p>
      <dl className="multiverse-readout__facts">
        <div>
          <dt>Type</dt>
          <dd>{location.type || 'Unknown'}</dd>
        </div>
        <div>
          <dt>Dimension</dt>
          <dd>{location.dimension || 'Unknown'}</dd>
        </div>
        <div>
          <dt>Residents</dt>
          <dd>{location.residents.length}</dd>
        </div>
      </dl>
    </div>
  )
}

export default MultiverseReadout
