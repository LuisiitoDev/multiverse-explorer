import { useEffect, useState } from 'react'

type HeroProps = {
  totalCount: number | null
  lastSyncedAt: number | null
  error: string | null
}

function formatRelativeTime(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))

  if (seconds < 1) {
    return 'just now'
  }

  if (seconds < 60) {
    return `${seconds}s ago`
  }

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  return `${Math.floor(minutes / 60)}h ago`
}

function Hero({ totalCount, lastSyncedAt, error }: HeroProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const lastSyncLabel = error ? 'Sync Failed' : lastSyncedAt ? formatRelativeTime(now - lastSyncedAt) : '—'

  return (
    <section className="hero" id="hero" aria-label="Introduction">
      <div className="diagnostic-panel" aria-hidden="true">
        <span className="diagnostic-panel__corner diagnostic-panel__corner--tl" />
        <span className="diagnostic-panel__corner diagnostic-panel__corner--br" />
        <div className="diagnostic-panel__scope">
          <span />
          <span />
        </div>
        <svg className="diagnostic-panel__wave" viewBox="0 0 100 30" preserveAspectRatio="none">
          <polyline
            points="0,20 10,20 15,6 22,26 30,14 38,20 48,20 55,10 62,22 70,16 80,20 100,20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="hero__copy">
        <p className="eyebrow">React + GitHub Actions demo</p>
        <h1>
          Rick and Morty
          <br />
          <span className="hero__accent">Multiverse Explorer</span>
        </h1>
        <p className="hero-copy">
          Browse characters from across infinite dimensions.
          <br />
          The multiverse is big. Our database is bigger.
        </p>
        <div className="hero__divider" aria-hidden="true">
          <span />
          <em />
          <span />
        </div>
      </div>

      <div className="hero__portal-wrap" aria-hidden="true">
        <div className="hero-portal">
          <div className="hero-portal__ring" />
          <div className="hero-portal__core" />
          <svg className="hero-portal__dashes" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" />
            <circle cx="50" cy="50" r="38" />
          </svg>
          <div className="hero-portal__particles">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="hud-panel">
          <p className="hud-panel__title">Dimension C-137</p>
          <dl className="hud-panel__stats">
            <div>
              <dt>Entries</dt>
              <dd>{totalCount !== null ? totalCount.toLocaleString() : '—'}</dd>
            </div>
            <div>
              <dt>Variants</dt>
              <dd>&#8734;</dd>
            </div>
            <div>
              <dt>Last Sync</dt>
              <dd className={error ? 'hud-panel__status--offline' : 'hud-panel__status--online'}>
                {lastSyncLabel}
              </dd>
            </div>
          </dl>
          <div className="hud-panel__radar">
            <span className="hud-panel__radar-sweep" />
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
