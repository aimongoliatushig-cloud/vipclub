import { useId } from 'react'

interface SparklineProps {
  values: number[]
  tone?: 'gold' | 'success' | 'danger' | 'neutral'
  label?: string
  width?: number
  height?: number
}

const colorByTone = {
  gold: '#B6892F',
  success: '#247653',
  danger: '#B3424D',
  neutral: '#68727E',
}

export function Sparkline({ values, tone = 'gold', label = 'Тренд', width = 124, height = 36 }: SparklineProps) {
  const titleId = useId()
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * (width - 6) + 3
      const y = height - 4 - ((value - min) / range) * (height - 8)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={titleId}>
      <title id={titleId}>{label}</title>
      <polyline points={points} fill="none" stroke={colorByTone[tone]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((value, index) => {
        const [x, y] = points.split(' ')[index].split(',')
        return <circle key={`${value}-${index}`} cx={x} cy={y} r="1.6" fill={colorByTone[tone]} />
      })}
    </svg>
  )
}
