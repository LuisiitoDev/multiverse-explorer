type MultiverseGlobeFallbackProps = Readonly<{
  onUse2D: () => void
}>

function MultiverseGlobeFallback({ onUse2D }: MultiverseGlobeFallbackProps) {
  return (
    <div className="panel-state panel-state--error" role="alert">
      <p className="panel-state__title">3D View Unavailable</p>
      <p className="panel-state__body">
        Your browser or device does not support WebGL, which the 3D globe needs. The 2D map shows
        the same locations.
      </p>
      <button type="button" className="panel-state__action" onClick={onUse2D}>
        Use 2D Map
      </button>
    </div>
  )
}

export default MultiverseGlobeFallback
