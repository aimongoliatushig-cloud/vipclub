import type { DailyRankComponentKey, EntertainerDashboard, RankData } from './api'

type UnknownRecord = Record<string, unknown>

const COMPONENT_ORDER: DailyRankComponentKey[] = [
  'attendance',
  'customer_complaints',
  'sales',
  'entertaining_skill',
  'cleanliness_beauty',
  'shift_effort',
  'personal_development',
  'entertainer_attitude',
]

const COMPONENT_LABELS: Record<DailyRankComponentKey, string> = {
  attendance: 'Ирц',
  customer_complaints: 'Зочны санал, гомдол',
  sales: 'Борлуулалт',
  entertaining_skill: 'Үзвэр, бүжгийн ур чадвар',
  cleanliness_beauty: 'Цэвэр байдал, төрх',
  shift_effort: 'Өдрийн гараа',
  personal_development: 'Хувийн хөгжил',
  entertainer_attitude: 'Хандлага',
}

const DEFAULT_RULES: RankData['rules'] = [
  { rank: 'Rank 3', label: '3-р зэрэг', minimum_score: 0, maximum_score: 80, maximum_inclusive: false, payout_percent: 50 },
  { rank: 'Rank 2', label: '2-р зэрэг', minimum_score: 80, maximum_score: 90, maximum_inclusive: false, payout_percent: 60 },
  { rank: 'Rank 1', label: '1-р зэрэг', minimum_score: 90, maximum_score: 100, maximum_inclusive: true, payout_percent: 70 },
]

const asRecord = (value: unknown): UnknownRecord => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {}
)

const asRecords = (value: unknown): UnknownRecord[] => (
  Array.isArray(value) ? value.map(asRecord) : []
)

const text = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

const numeric = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const rankName = (value: unknown): string => {
  const rank = text(value) || ''
  if (/^(rank\s*)?1$|1-\u0440|diamond|gold/i.test(rank)) return 'Rank 1'
  if (/^(rank\s*)?2$|2-\u0440|silver/i.test(rank)) return 'Rank 2'
  return 'Rank 3'
}

const rankLabel = (rank: string): string => (
  rank === 'Rank 1' ? '1-р зэрэг' : rank === 'Rank 2' ? '2-р зэрэг' : '3-р зэрэг'
)

const payoutPercent = (rank: string): number => (
  rank === 'Rank 1' ? 70 : rank === 'Rank 2' ? 60 : 50
)

const nextRank = (rank: string): string | null => (
  rank === 'Rank 3' ? 'Rank 2' : rank === 'Rank 2' ? 'Rank 1' : null
)

const nextThreshold = (rank: string | null): number | null => (
  rank === 'Rank 2' ? 80 : rank === 'Rank 1' ? 90 : null
)

const nextDate = (value: string | null): string | null => {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

const componentKey = (value: unknown): DailyRankComponentKey | null => {
  const key = text(value)
  if (!key) return null
  if (COMPONENT_ORDER.includes(key as DailyRankComponentKey)) return key as DailyRankComponentKey
  if (key === 'behavior') return 'shift_effort'
  return null
}

/**
 * Accept both the current rank contract and the older production payload.
 * The adapter deliberately fills all eight rows so the rank view can never
 * crash merely because one backend field or list is absent.
 */
export function normalizeRankData(payload: unknown, fallback?: EntertainerDashboard): RankData {
  const root = asRecord(payload)
  const current = asRecord(root.current)
  const daily = Object.keys(asRecord(root.daily_rank)).length
    ? asRecord(root.daily_rank)
    : asRecord(fallback?.profile.daily_rank)
  const rawComponents = asRecords(root.components).length
    ? asRecords(root.components)
    : asRecords(daily.components).length
      ? asRecords(daily.components)
      : asRecords(root.evidence)
  const componentsByKey = new Map<DailyRankComponentKey, UnknownRecord>()
  rawComponents.forEach((row) => {
    const key = componentKey(row.key ?? row.component)
    if (key) componentsByKey.set(key, row)
  })

  const components: RankData['components'] = COMPONENT_ORDER.map((key) => {
    const row = componentsByKey.get(key) || {}
    const score = numeric(row.score ?? row.value)
    const status = text(row.data_status ?? row.status)
    const verified = status === 'verified'
    const notApplicable = status === 'not_applicable' || status === 'excluded'
    return {
      key,
      label: text(row.label) || COMPONENT_LABELS[key],
      score,
      weight: numeric(row.weight) || 0,
      contribution: numeric(row.contribution),
      data_status: verified ? 'verified' : notApplicable ? 'not_applicable' : 'missing',
      target_status: text(row.target_status) === 'met'
        ? 'met'
        : text(row.target_status) === 'not_met'
          ? 'not_met'
          : score == null
            ? 'unknown'
            : score >= 70 ? 'met' : 'not_met',
      source_label: text(row.source_label ?? row.detail) || (verified ? 'Баталгаажсан үнэлгээ' : 'Үнэлгээ хүлээгдэж байна'),
    }
  })

  const effectiveRank = rankName(root.effective_rank ?? current.current_rank ?? fallback?.profile.current_rank)
  const complete = text(root.score_status) === 'complete'
    || text(daily.status)?.toLowerCase() === 'complete'
  const score = complete
    ? numeric(root.score ?? daily.displayed_score ?? daily.weighted_score ?? current.current_points)
    : numeric(root.score)
  const calculated = complete && text(root.calculated_next_rank ?? daily.calculated_rank)
    ? rankName(root.calculated_next_rank ?? daily.calculated_rank)
    : null
  const promotionRank = text(root.next_rank)
    ? rankName(root.next_rank)
    : text(asRecord(root.next_target).rank)
      ? rankName(asRecord(root.next_target).rank)
      : nextRank(effectiveRank)
  const promotionThreshold = numeric(root.next_rank_threshold ?? asRecord(root.next_target).score_required)
    ?? nextThreshold(promotionRank)
  const scoringDate = text(root.scoring_date ?? daily.scoring_date)
  const missingComponents = Array.isArray(root.missing_components)
    ? root.missing_components.map(componentKey).filter((key): key is DailyRankComponentKey => Boolean(key))
    : Array.isArray(daily.missing_components)
      ? daily.missing_components.map(componentKey).filter((key): key is DailyRankComponentKey => Boolean(key))
      : components.filter((item) => item.data_status === 'missing').map((item) => item.key)

  const history: RankData['history'] = asRecords(root.history).map((row) => {
    const historicalRank = text(row.calculated_rank) ? rankName(row.calculated_rank) : null
    const followingRank = rankName(row.next_day_effective_rank ?? historicalRank ?? effectiveRank)
    return {
      scoring_date: text(row.scoring_date),
      score: numeric(row.score),
      score_status: text(row.score_status) === 'complete' ? 'complete' : 'incomplete',
      calculated_rank: historicalRank,
      calculated_rank_label: historicalRank ? rankLabel(historicalRank) : null,
      next_day_effective_rank: followingRank,
      next_day_effective_rank_label: rankLabel(followingRank),
      data_provenance: text(row.data_provenance) === 'DEMO'
        ? 'DEMO'
        : text(row.data_provenance) === 'VERIFIED'
          ? 'VERIFIED'
          : 'UNRESOLVED',
    }
  })

  const rules: RankData['rules'] = asRecords(root.rules).length
    ? asRecords(root.rules).map((row) => {
        const rank = rankName(row.rank)
        return {
          rank,
          label: text(row.label) || rankLabel(rank),
          minimum_score: numeric(row.minimum_score) || 0,
          maximum_score: numeric(row.maximum_score) ?? 100,
          maximum_inclusive: Boolean(row.maximum_inclusive),
          payout_percent: numeric(row.payout_percent) ?? payoutPercent(rank),
        }
      })
    : DEFAULT_RULES

  const calculatedChangesRank = Boolean(calculated && calculated !== effectiveRank)
  const missingScore = numeric(root.missing_score ?? asRecord(root.next_target).score_needed)
    ?? (score != null && promotionThreshold != null ? Math.max(0, promotionThreshold - score) : null)

  return {
    scoring_date: scoringDate,
    data_provenance: text(root.data_provenance) === 'DEMO'
      ? 'DEMO'
      : text(root.data_provenance) === 'VERIFIED'
        ? 'VERIFIED'
        : 'UNRESOLVED',
    demo_batch: text(root.demo_batch),
    score,
    daily_score: numeric(root.daily_score ?? daily.daily_score ?? daily.weighted_score),
    counted_days: numeric(root.counted_days ?? daily.counted_days) ?? 0,
    score_basis: 'attendance_day_career_average',
    score_status: score != null && complete ? 'complete' : 'incomplete',
    effective_rank: effectiveRank,
    effective_rank_label: text(root.effective_rank_label) || rankLabel(effectiveRank),
    effective_from: text(root.effective_from),
    payout_percent: numeric(root.payout_percent ?? current.payout_percent) ?? payoutPercent(effectiveRank),
    calculated_next_rank: calculated,
    calculated_next_rank_label: calculated ? rankLabel(calculated) : null,
    calculated_next_payout_percent: calculated
      ? (numeric(root.calculated_next_payout_percent)
        ?? rules.find(rule => rule.rank === calculated)?.payout_percent
        ?? payoutPercent(calculated))
      : null,
    next_effective_from: text(root.next_effective_from) || (calculatedChangesRank ? nextDate(scoringDate) : null),
    next_rank: promotionRank,
    next_rank_label: promotionRank ? rankLabel(promotionRank) : null,
    next_rank_threshold: promotionThreshold,
    missing_score: missingScore,
    missing_components: missingComponents,
    components,
    history,
    rules,
  }
}

export function rankDataFromDashboard(dashboard: EntertainerDashboard): RankData {
  return normalizeRankData({}, dashboard)
}
