export const DEFAULT_ENTERTAINER_RANK = 'Rank 3'

const LABELS: Record<string, string> = {
  'Rank 1': '1-р зэрэг',
  'Rank 2': '2-р зэрэг',
  'Rank 3': '3-р зэрэг',
  Diamond: '1-р зэрэг',
  Gold: '1-р зэрэг',
  Silver: '2-р зэрэг',
  Bronze: '3-р зэрэг',
}

export function entertainerRankLabel(rank?: string | null): string {
  const value = (rank || '').trim()
  return LABELS[value] || value || 'Зэрэглэл тогтоогоогүй'
}

export function entertainerRankTone(rank?: string | null): 'rank-1' | 'rank-2' | 'rank-3' {
  const value = (rank || DEFAULT_ENTERTAINER_RANK).trim()
  if (value === 'Rank 1' || value === 'Diamond' || value === 'Gold') return 'rank-1'
  if (value === 'Rank 2' || value === 'Silver') return 'rank-2'
  return 'rank-3'
}
