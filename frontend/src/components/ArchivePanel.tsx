import type { ReactNode } from 'react'

type ArchivePanelProps = {
  icon: ReactNode
  title: string
  subtitle: string
  children: ReactNode
}

function ArchivePanel({ icon, title, subtitle, children }: ArchivePanelProps) {
  return (
    <section className="archive-panel">
      <header className="archive-panel__header">
        <span className="archive-panel__icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h2 className="archive-panel__title">{title}</h2>
          <p className="archive-panel__subtitle">{subtitle}</p>
        </div>
      </header>
      {children}
    </section>
  )
}

export default ArchivePanel
