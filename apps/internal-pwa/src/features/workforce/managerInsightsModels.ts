import type { EntertainerRank } from './models'

export type CustomerMembershipLevel = 'provisional' | 'level-1' | 'level-2' | 'level-3' | 'level-4' | 'level-5'
export type CustomerActivityState = 'recent' | 'watch' | 'lapsed'
export type ConsentChannel = 'viber' | 'telegram' | 'email'

export interface CustomerVisitSummary {
  id: string
  date: string
  branchName: string
  status: 'completed' | 'cancelled' | 'refunded'
  eligibleSpend: number
  entertainerName?: string
}

export interface EntertainerAffinity {
  teamMemberId: string
  entertainerName: string
  reservationCount: number
  sharePercent: number
}

export interface CustomerIntelligenceRecord {
  id: string
  displayName: string
  maskedPhone: string
  branchId: string
  membershipLevel: CustomerMembershipLevel
  levelSource: string
  memberSince: string
  activityState: CustomerActivityState
  lastVisitAt: string
  visits90d: number
  averageSpend: number
  minimumSpend: number
  maximumSpend: number
  lifetimeValue: number
  monthlyEligibleSpend: [number, number, number]
  preferredVisitWindow: string
  benefitUses90d: number
  cashbackBalance: number
  consentedChannels: ConsentChannel[]
  affinities: EntertainerAffinity[]
  recentVisits: CustomerVisitSummary[]
  dataFreshAt: string
  sourceState: 'reconciled' | 'delayed'
}

export interface EntertainerRankingEvidence {
  teamMemberId: string
  branchId: string
  currentRank: EntertainerRank
  rankEffectiveFrom: string
  rankSource: string
  attendancePercent: number
  unresolvedNoShows: number
  verifiedReservations: number
  repeatCustomers: number
  salesTrendPercent: number
  trainingCompleted: number
  openComplaints: number
  verifiedHistoryMonths: number
  dataQuality: 'complete' | 'partial'
  dataFreshAt: string
}

export interface ManagerInsightsSnapshot {
  branchId: string
  branchName: string
  refreshedAt: string
  customers: CustomerIntelligenceRecord[]
  entertainerRankings: EntertainerRankingEvidence[]
}
