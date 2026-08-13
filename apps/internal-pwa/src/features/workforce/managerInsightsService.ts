import type { ManagerInsightsSnapshot } from './managerInsightsModels'

const AUTHORIZED_BRANCH_ID = 'branch-central'

const snapshot: ManagerInsightsSnapshot = {
  branchId: AUTHORIZED_BRANCH_ID,
  branchName: 'Төв салбар',
  refreshedAt: '2026-08-13T13:08:00+08:00',
  customers: [
    {
      id: 'customer-1', displayName: 'Саруул Н.', maskedPhone: '•••• 4821', branchId: AUTHORIZED_BRANCH_ID,
      membershipLevel: 'black-diamond', levelSource: 'Одоогийн эх системийн түвшин', memberSince: '2024-02-12', activityState: 'recent',
      lastVisitAt: '2026-08-12T22:40:00+08:00', visits90d: 14, averageSpend: 2860000, minimumSpend: 1420000, maximumSpend: 5180000,
      lifetimeValue: 68400000, completedEligibleVisits: 14, eligibleSpendTotal: 40040000, excludedSpendTotal: 320000, preferredVisitWindow: 'Баасан, Бямба · 21:00–01:00',
      benefitUses90d: 3, consentedChannels: ['viber', 'email'],
      affinities: [
        { teamMemberId: 'tm-solongo', entertainerName: 'Цэрэн Солонго', reservationCount: 8, sharePercent: 57 },
        { teamMemberId: 'tm-anu', entertainerName: 'Бат Ану', reservationCount: 3, sharePercent: 21 },
      ],
      recentVisits: [
        { id: 'visit-1', date: '2026-08-12', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 3180000, entertainerName: 'Цэрэн Солонго' },
        { id: 'visit-2', date: '2026-08-02', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 2640000, entertainerName: 'Цэрэн Солонго' },
        { id: 'visit-3', date: '2026-07-25', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 1810000, entertainerName: 'Бат Ану' },
      ],
      dataFreshAt: '2026-08-13T13:08:00+08:00', sourceState: 'reconciled',
    },
    {
      id: 'customer-2', displayName: 'Тэмүүлэн Б.', maskedPhone: '•••• 7734', branchId: AUTHORIZED_BRANCH_ID,
      membershipLevel: 'diamond', levelSource: 'Одоогийн эх системийн түвшин', memberSince: '2024-09-08', activityState: 'recent',
      lastVisitAt: '2026-08-10T23:15:00+08:00', visits90d: 10, averageSpend: 2140000, minimumSpend: 980000, maximumSpend: 3970000,
      lifetimeValue: 42100000, completedEligibleVisits: 10, eligibleSpendTotal: 21400000, excludedSpendTotal: 180000, preferredVisitWindow: 'Пүрэв, Бямба · 22:00–02:00',
      benefitUses90d: 2, consentedChannels: ['telegram'],
      affinities: [{ teamMemberId: 'tm-anu', entertainerName: 'Бат Ану', reservationCount: 6, sharePercent: 60 }],
      recentVisits: [
        { id: 'visit-4', date: '2026-08-10', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 2310000, entertainerName: 'Бат Ану' },
        { id: 'visit-5', date: '2026-07-30', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 1980000, entertainerName: 'Бат Ану' },
      ],
      dataFreshAt: '2026-08-13T13:08:00+08:00', sourceState: 'reconciled',
    },
    {
      id: 'customer-3', displayName: 'Оюун Э.', maskedPhone: '•••• 1168', branchId: AUTHORIZED_BRANCH_ID,
      membershipLevel: 'provisional', levelSource: 'Шинэ харилцагчийн түр төлөв', memberSince: '2026-07-28', activityState: 'recent',
      lastVisitAt: '2026-08-09T20:30:00+08:00', visits90d: 2, averageSpend: 1720000, minimumSpend: 1510000, maximumSpend: 1930000,
      lifetimeValue: 3440000, completedEligibleVisits: 2, eligibleSpendTotal: 3440000, excludedSpendTotal: 0, preferredVisitWindow: 'Ням · 20:00–23:00',
      benefitUses90d: 0, consentedChannels: ['viber'],
      affinities: [{ teamMemberId: 'tm-bolor', entertainerName: 'Эрдэнэ Болор', reservationCount: 1, sharePercent: 50 }],
      recentVisits: [
        { id: 'visit-6', date: '2026-08-09', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 1930000, entertainerName: 'Эрдэнэ Болор' },
        { id: 'visit-7', date: '2026-07-28', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 1510000 },
      ],
      dataFreshAt: '2026-08-13T13:08:00+08:00', sourceState: 'reconciled',
    },
    {
      id: 'customer-4', displayName: 'Энхжин Д.', maskedPhone: '•••• 9052', branchId: AUTHORIZED_BRANCH_ID,
      membershipLevel: 'gold', levelSource: 'Одоогийн эх системийн түвшин', memberSince: '2025-03-17', activityState: 'watch',
      lastVisitAt: '2026-07-24T21:10:00+08:00', visits90d: 6, averageSpend: 1480000, minimumSpend: 720000, maximumSpend: 2460000,
      lifetimeValue: 19800000, completedEligibleVisits: 6, eligibleSpendTotal: 8880000, excludedSpendTotal: 240000, preferredVisitWindow: 'Лхагва, Баасан · 20:00–00:00',
      benefitUses90d: 1, consentedChannels: ['email'],
      affinities: [{ teamMemberId: 'tm-naraa', entertainerName: 'Мөнх Нараа', reservationCount: 3, sharePercent: 50 }],
      recentVisits: [
        { id: 'visit-8', date: '2026-07-24', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 1240000, entertainerName: 'Мөнх Нараа' },
        { id: 'visit-9', date: '2026-07-11', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 1040000, entertainerName: 'Мөнх Нараа' },
      ],
      dataFreshAt: '2026-08-13T12:52:00+08:00', sourceState: 'delayed',
    },
    {
      id: 'customer-5', displayName: 'Мөнх-Оргил Ц.', maskedPhone: '•••• 6407', branchId: AUTHORIZED_BRANCH_ID,
      membershipLevel: 'silver', levelSource: 'Одоогийн эх системийн түвшин', memberSince: '2025-11-03', activityState: 'watch',
      lastVisitAt: '2026-07-18T22:05:00+08:00', visits90d: 4, averageSpend: 920000, minimumSpend: 610000, maximumSpend: 1320000,
      lifetimeValue: 8700000, completedEligibleVisits: 4, eligibleSpendTotal: 3680000, excludedSpendTotal: 90000, preferredVisitWindow: 'Бямба · 22:00–01:00',
      benefitUses90d: 0, consentedChannels: [],
      affinities: [{ teamMemberId: 'tm-bolor', entertainerName: 'Эрдэнэ Болор', reservationCount: 2, sharePercent: 50 }],
      recentVisits: [{ id: 'visit-10', date: '2026-07-18', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 630000, entertainerName: 'Эрдэнэ Болор' }],
      dataFreshAt: '2026-08-13T13:08:00+08:00', sourceState: 'reconciled',
    },
    {
      id: 'customer-6', displayName: 'Ариунаа Г.', maskedPhone: '•••• 2289', branchId: AUTHORIZED_BRANCH_ID,
      membershipLevel: 'bronze', levelSource: 'Одоогийн эх системийн түвшин', memberSince: '2025-06-22', activityState: 'lapsed',
      lastVisitAt: '2026-05-04T19:45:00+08:00', visits90d: 1, averageSpend: 680000, minimumSpend: 680000, maximumSpend: 680000,
      lifetimeValue: 5300000, completedEligibleVisits: 1, eligibleSpendTotal: 680000, excludedSpendTotal: 0, preferredVisitWindow: 'Ажлын өдөр · 19:00–22:00',
      benefitUses90d: 0, consentedChannels: ['telegram'],
      affinities: [],
      recentVisits: [{ id: 'visit-11', date: '2026-05-04', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 680000 }],
      dataFreshAt: '2026-08-13T13:08:00+08:00', sourceState: 'reconciled',
    },
  ],
  entertainerRankings: [
    { teamMemberId: 'tm-anu', branchId: AUTHORIZED_BRANCH_ID, currentRank: 'Rank3', rankEffectiveFrom: '2026-08-04', rankSource: 'Одоогийн эх системийн зэрэглэл', attendancePercent: 98, unresolvedNoShows: 0, verifiedReservations: 6, repeatCustomers: 3, salesTrendPercent: 12, trainingCompleted: 1, openComplaints: 0, verifiedHistoryDays: 14, evaluationCadenceDays: 14, dataQuality: 'complete', dataFreshAt: '2026-08-13T13:08:00+08:00' },
    { teamMemberId: 'tm-bolor', branchId: AUTHORIZED_BRANCH_ID, currentRank: 'Rank2', rankEffectiveFrom: '2026-08-04', rankSource: 'Одоогийн эх системийн зэрэглэл', attendancePercent: 94, unresolvedNoShows: 0, verifiedReservations: 4, repeatCustomers: 2, salesTrendPercent: 4, trainingCompleted: 1, openComplaints: 0, verifiedHistoryDays: 14, evaluationCadenceDays: 14, dataQuality: 'complete', dataFreshAt: '2026-08-13T13:08:00+08:00' },
    { teamMemberId: 'tm-naraa', branchId: AUTHORIZED_BRANCH_ID, currentRank: 'Rank1', rankEffectiveFrom: '2026-08-04', rankSource: 'Одоогийн эх системийн зэрэглэл', attendancePercent: 89, unresolvedNoShows: 1, verifiedReservations: 2, repeatCustomers: 1, salesTrendPercent: -6, trainingCompleted: 0, openComplaints: 1, verifiedHistoryDays: 9, evaluationCadenceDays: 14, dataQuality: 'partial', dataFreshAt: '2026-08-13T12:52:00+08:00' },
    { teamMemberId: 'tm-solongo', branchId: AUTHORIZED_BRANCH_ID, currentRank: 'Rank3', rankEffectiveFrom: '2026-08-04', rankSource: 'Одоогийн эх системийн зэрэглэл', attendancePercent: 99, unresolvedNoShows: 0, verifiedReservations: 7, repeatCustomers: 4, salesTrendPercent: 18, trainingCompleted: 1, openComplaints: 0, verifiedHistoryDays: 14, evaluationCadenceDays: 14, dataQuality: 'complete', dataFreshAt: '2026-08-13T13:08:00+08:00' },
  ],
}

export interface ManagerInsightsService {
  getSnapshot(branchId?: string): ManagerInsightsSnapshot
}

export class BrowserManagerInsightsService implements ManagerInsightsService {
  getSnapshot(branchId = AUTHORIZED_BRANCH_ID): ManagerInsightsSnapshot {
    if (branchId !== AUTHORIZED_BRANCH_ID) throw new Error('Энэ салбарын харилцагч болон зэрэглэлийн мэдээллийг харах эрхгүй байна.')
    return structuredClone(snapshot)
  }
}
