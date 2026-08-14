import type { Severity } from '../../domain/types'

interface StatusMarkProps {
  tone: Severity | 'neutral' | 'info'
  label: string
  compact?: boolean
}

export function StatusMark({ tone, label, compact = false }: StatusMarkProps) {
  return (
    <span className="status-mark" data-tone={tone} data-compact={compact || undefined}>
      <span className="status-mark__dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}
