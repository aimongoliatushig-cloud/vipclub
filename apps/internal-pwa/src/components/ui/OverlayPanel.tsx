import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface OverlayPanelProps {
  open: boolean
  title: string
  description?: string
  onClose(): void
  children: ReactNode
  footer?: ReactNode
  variant?: 'drawer' | 'modal' | 'sheet'
  wide?: boolean
}

export function OverlayPanel({ open, title, description, onClose, children, footer, variant = 'drawer', wide = false }: OverlayPanelProps) {
  const panelRef = useRef<HTMLElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const getFocusable = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = getFocusable()
      if (!focusable.length) {
        event.preventDefault()
        panelRef.current?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('overlay-open')
    const firstFocusable = getFocusable()[0]
    ;(firstFocusable ?? panelRef.current)?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('overlay-open')
      returnFocusRef.current?.focus({ preventScroll: true })
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="overlay" data-variant={variant} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={panelRef} className="overlay__panel" data-wide={wide || undefined} role="dialog" aria-modal="true" aria-labelledby="overlay-title" tabIndex={-1}>
        <header className="overlay__header">
          <div>
            <h2 id="overlay-title">{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Хаах">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="overlay__content">{children}</div>
        {footer ? <footer className="overlay__footer">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  )
}
