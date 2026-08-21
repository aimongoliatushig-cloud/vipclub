import './RankCrest.css'
import { entertainerRankTone } from '../ranks'

type Props = {
  rank?: string | null
  className?: string
  label?: string
}

const crestSources = {
  'rank-1': '/staff/rank-icons/rank-1.png?v=20260818-1',
  'rank-2': '/staff/rank-icons/rank-2.png?v=20260818-1',
  'rank-3': '/staff/rank-icons/rank-3.png?v=20260818-3',
} as const

export function RankCrest({ rank, className = '', label }: Props) {
  const tone = entertainerRankTone(rank)

  return <img
    className={`rank-crest rank-crest--${tone} ${className}`.trim()}
    src={crestSources[tone]}
    alt={label || ''}
    aria-hidden={label ? undefined : true}
  />
}
