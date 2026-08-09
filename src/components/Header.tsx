import type { View } from '../types/view'

const GITHUB_REPO_URL = 'https://github.com/LuisiitoDev/react-github-actions-demo'

type HeaderProps = {
  activeView: View
  onNavigate: (view: View) => void
}

function ExploreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor">
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
    </svg>
  )
}

function CharactersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="7" r="2.4" />
      <path d="M15.5 12.2c2.6.4 4.5 2.7 4.5 5.3" />
    </svg>
  )
}

function LocationsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  )
}

function EpisodesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M3 9h18M8 5v4M16 5v4" />
    </svg>
  )
}

function SwirlIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
      <path d="M12 12c2-2 5-1 5 1.5S13.5 17 12 15s-2-5 0-3" strokeLinecap="round" />
    </svg>
  )
}

function Header({ activeView, onNavigate }: HeaderProps) {
  const isCharactersView = activeView === 'characters'

  return (
    <header className="site-header">
      <a className="brand" href="#hero" onClick={() => onNavigate('characters')}>
        <span className="brand__mark" aria-hidden="true">
          <SwirlIcon />
        </span>
        <span className="brand__text">
          <span className="brand__title">Multiverse Terminal</span>
          <span className="brand__subtitle">Interdimensional Database</span>
        </span>
      </a>

      <nav className="site-nav" aria-label="Primary">
        <a
          className={`site-nav__link ${isCharactersView ? 'site-nav__link--active' : ''}`}
          href="#hero"
          onClick={() => onNavigate('characters')}
        >
          <ExploreIcon />
          Explore
        </a>
        <a
          className="site-nav__link"
          href="#content"
          onClick={() => onNavigate('characters')}
        >
          <CharactersIcon />
          Characters
        </a>
        <button
          type="button"
          className={`site-nav__link ${activeView === 'locations' ? 'site-nav__link--active' : ''}`}
          onClick={() => onNavigate('locations')}
        >
          <LocationsIcon />
          Locations
        </button>
        <button
          type="button"
          className={`site-nav__link ${activeView === 'episodes' ? 'site-nav__link--active' : ''}`}
          onClick={() => onNavigate('episodes')}
        >
          <EpisodesIcon />
          Episodes
        </button>
      </nav>

      <div className="header-status">
        <div className="system-readout">
          <span className="system-readout__id">DB-C137</span>
          <span className="system-readout__link">LINK: STABLE</span>
        </div>
        <a
          className="icon-button"
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
        >
          <SwirlIcon />
        </a>
      </div>
    </header>
  )
}

export default Header
