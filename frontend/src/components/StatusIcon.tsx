type StatusIconProps = {
  status: string
}

function StatusIcon({ status }: StatusIconProps) {
  const normalized = status.toLowerCase()

  if (normalized === 'alive') {
    return (
      <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="none">
        <path
          d="M2 12h4l2-7 4 14 2-7h8"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (normalized === 'dead') {
    return (
      <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
        <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M9.5 9.2a2.5 2.5 0 1 1 3.7 2.2c-.9.5-1.2 1-1.2 1.9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" />
    </svg>
  )
}

export default StatusIcon
