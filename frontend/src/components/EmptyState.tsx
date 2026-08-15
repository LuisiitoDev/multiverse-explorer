type EmptyStateProps = {
  onResetFilters: () => void
  title?: string
  message?: string
}

function EmptyState({
  onResetFilters,
  title = 'No Life Forms Detected',
  message = 'Try another name or dimension filter.',
}: EmptyStateProps) {
  return (
    <div className="panel-state">
      <p className="panel-state__title">{title}</p>
      <p className="panel-state__body">{message}</p>
      <button type="button" className="panel-state__action" onClick={onResetFilters}>
        Reset Filters
      </button>
    </div>
  )
}

export default EmptyState
