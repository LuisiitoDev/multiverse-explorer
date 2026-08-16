import { useEffect, useRef, type ReactNode } from 'react'

type ModalProps = Readonly<{
  titleId: string
  onClose: () => void
  closeLabel: string
  children: ReactNode
  dialogClassName?: string
}>

function Modal({ titleId, onClose, closeLabel, children, dialogClassName = '' }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previouslyFocusedElement.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedElement.current?.focus()
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`modal-dialog ${dialogClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="modal-dialog__close"
          onClick={onClose}
          aria-label={closeLabel}
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  )
}

export default Modal
