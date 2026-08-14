interface ProgressBarProps {
  value: number
  max?: number
  tone?: 'gold' | 'success' | 'danger' | 'neutral'
  label: string
}

export function ProgressBar({ value, max = 100, tone = 'gold', label }: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="progress" aria-label={`${label}: ${Math.round(percent)}%`}>
      <span className="progress__bar" data-tone={tone} style={{ width: `${percent}%` }} />
    </div>
  )
}
