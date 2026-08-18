import { CheckCircle2, Info, X } from 'lucide-react'
import { useEffect } from 'react'
import { useApp } from '../../state/useApp'

export function Toast() {
  const { toast, clearToast } = useApp()

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(clearToast, 4200)
    return () => window.clearTimeout(timeout)
  }, [toast, clearToast])

  if (!toast) return null
  const Icon = toast.tone === 'success' ? CheckCircle2 : Info
  return (
    <div className="toast" data-tone={toast.tone ?? 'neutral'} role="status">
      <Icon size={20} aria-hidden="true" />
      <div>
        <strong>{toast.title}</strong>
        {toast.description ? <span>{toast.description}</span> : null}
      </div>
      <button type="button" className="icon-button icon-button--small" onClick={clearToast} aria-label="Мэдэгдэл хаах">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
