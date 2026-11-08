export type ViewMode = '2d' | '3d'

type MultiverseMapModeToggleProps = Readonly<{
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}>

const OPTIONS: { mode: ViewMode; label: string }[] = [
  { mode: '2d', label: '2D' },
  { mode: '3d', label: '3D' },
]

function MultiverseMapModeToggle({ mode, onChange }: MultiverseMapModeToggleProps) {
  return (
    <div className="multiverse-toggle" role="group" aria-label="Map view">
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          className={`multiverse-toggle__option ${
            mode === option.mode ? 'multiverse-toggle__option--active' : ''
          }`}
          aria-pressed={mode === option.mode}
          onClick={() => onChange(option.mode)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default MultiverseMapModeToggle
