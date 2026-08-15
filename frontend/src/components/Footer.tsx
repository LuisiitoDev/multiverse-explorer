function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <p className="site-footer__text">
        Fan-made interdimensional explorer. Powered by the{' '}
        <a href="https://rickandmortyapi.com" target="_blank" rel="noopener noreferrer">
          Rick and Morty API
        </a>
        . Built with React + TypeScript.
      </p>

      <div className="site-footer__links">
        <a
          href="https://github.com/LuisiitoDev/react-github-actions-demo"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub Repo
          <ExternalLinkIcon />
        </a>
        <a href="https://rickandmortyapi.com" target="_blank" rel="noopener noreferrer">
          Rick and Morty API
          <ExternalLinkIcon />
        </a>
      </div>
    </footer>
  )
}

export default Footer
