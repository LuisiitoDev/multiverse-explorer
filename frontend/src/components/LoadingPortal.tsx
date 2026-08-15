function LoadingPortal() {
  return (
    <div className="loading-portal" role="status" aria-live="polite">
      <span className="loading-portal__ring" aria-hidden="true" />
      <p>Scanning dimensions...</p>
    </div>
  )
}

export default LoadingPortal
