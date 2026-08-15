import { SiReact, SiGithubactions, SiDocker, SiGithub } from 'react-icons/si'

function DiamondIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="6" y="6" width="12" height="12" rx="2" transform="rotate(45 12 12)" />
    </svg>
  )
}

// Simple Icons (react-icons/si) ships no Microsoft Azure mark, so this stage reproduces the
// official Azure Container Apps icon: an isometric container box orbited by a connecting ring.
function AzureContainerAppsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="12" r="9.3" fill="none" stroke="#3dc9f0" strokeWidth="1.6" />
      <path d="M12 3 L20 7 L12 11 L4 7 Z" fill="#c3b6ea" />
      <path d="M4 7 L12 11 L12 21 L4 17 Z" fill="#8a78c9" />
      <path d="M12 11 L20 7 L20 17 L12 21 Z" fill="#4b3d91" />
      <path d="M6.8 8.4V18.4M9.2 9.6V19.6" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinecap="round" />
      <circle cx="18.6" cy="5.4" r="2.1" fill="#3dc9f0" stroke="#050a12" strokeWidth="1.1" />
      <circle cx="5.4" cy="18.6" r="2.1" fill="#3dc9f0" stroke="#050a12" strokeWidth="1.1" />
    </svg>
  )
}

const PIPELINE_STAGES = [
  { label: 'React', sub: 'Build', status: 'READY', icon: SiReact, accent: 'accent-green' },
  { label: 'GitHub Actions', sub: 'Automate', status: 'PASSING', icon: SiGithubactions, accent: 'accent-cyan' },
  { label: 'Docker', sub: 'Build Image', status: 'READY', icon: SiDocker, accent: 'accent-purple' },
  { label: 'GHCR', sub: 'Store Image', status: 'READY', icon: SiGithub, accent: 'accent-amber' },
  { label: 'Azure Container Apps', sub: 'Deploy', status: 'ONLINE', icon: AzureContainerAppsIcon, accent: 'accent-green' },
]

function DeploymentStatus() {
  return (
    <section className="deployment-status" aria-label="Deployment pipeline">
      <div className="deployment-status__header">
        <span className="deployment-status__icon" aria-hidden="true">
          <DiamondIcon />
        </span>
        <h2 className="deployment-status__title">Multiverse Deployment Status</h2>
      </div>

      <div className="pipeline">
        {PIPELINE_STAGES.map((stage, index) => {
          const Icon = stage.icon
          return (
            <div className="pipeline__stage-wrap" key={stage.label}>
              <div className="pipeline__stage">
                <span className={`pipeline__stage-icon ${stage.accent}`} aria-hidden="true">
                  <Icon size={22} />
                </span>
                <p className="pipeline__stage-label">{stage.label}</p>
                <p className="pipeline__stage-sub">{stage.sub}</p>
                <span className="pipeline__stage-status">{stage.status}</span>
              </div>
              {index < PIPELINE_STAGES.length - 1 && (
                <span className="pipeline__arrow" aria-hidden="true">
                  &#8594;
                </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default DeploymentStatus
