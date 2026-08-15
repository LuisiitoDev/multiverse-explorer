type ErrorStateProps = {
  message: string
  onRetry: () => void
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="panel-state panel-state--error" role="alert">
      <p className="panel-state__title">Portal Connection Lost</p>
      <p className="panel-state__body">Unable to contact the interdimensional database. {message}</p>
      <button type="button" className="panel-state__action" onClick={onRetry}>
        Retry Scan
      </button>
    </div>
  )
}

export default ErrorState
