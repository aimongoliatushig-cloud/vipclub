import type { ManagerInsightsSnapshot } from './managerInsightsModels'

const AUTHORIZED_BRANCH_ID = 'branch-central'

const snapshot: ManagerInsightsSnapshot = {
  branchId: AUTHORIZED_BRANCH_ID,
  branchName: 'Төв салбар',
  refreshedAt: '2026-08-13T13:08:00+08:00',
  customers: [
    {
      id: 'customer-1', displayName: 'Саруул Н.', maskedPhone: '•••• 4821', branchId: AUTHORIZED_BRANCH_ID,
      membershipLevel: 'level-5', levelSource: 'Одоогийн эх системийн түвшин', memberSince: '2024-02-12', activityState: 'recent',
      lastVisitAt: '2026-08-12T22:40:00+08:00', visits90d: 14, averageSpend: 2860000, minimumSpend: 1420000, maximumSpend: 5180000,
      lifetimeValue: 68400000, monthlyEligibleSpend: [8600000, 7900000, 9400000], preferredVisitWindow: 'Баасан, Бямба · 21:00–01:00',
      benefitUses90d: 3, cashbackBalance: 420000, consentedChannels: ['viber', 'email'],
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
      membershipLevel: 'level-4', levelSource: 'Одоогийн эх системийн түвшин', memberSince: '2024-09-08', activityState: 'recent',
      lastVisitAt: '2026-08-10T23:15:00+08:00', visits90d: 10, averageSpend: 2140000, minimumSpend: 980000, maximumSpend: 3970000,
      lifetimeValue: 42100000, monthlyEligibleSpend: [6100000, 5800000, 6700000], preferredVisitWindow: 'Пүрэв, Бямба · 22:00–02:00',
      benefitUses90d: 2, cashbackBalance: 265000, consentedChannels: ['telegram'],
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
      lifetimeValue: 3440000, monthlyEligibleSpend: [0, 1510000, 1930000], preferredVisitWindow: 'Ням · 20:00–23:00',
      benefitUses90d: 0, cashbackBalance: 34000, consentedChannels: ['viber'],
      affinities: [{ teamMemberId: 'tm-bolor', entertainerName: 'Эрдэнэ Болор', reservationCount: 1, sharePercent: 50 }],
      recentVisits: [
        { id: 'visit-6', date: '2026-08-09', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 1930000, entertainerName: 'Эрдэнэ Болор' },
        { id: 'visit-7', date: '2026-07-28', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 1510000 },
      ],
      dataFreshAt: '2026-08-13T13:08:00+08:00', sourceState: 'reconciled',
    },
    {
      id: 'customer-4', displayName: 'Энхжин Д.', maskedPhone: '•••• 9052', branchId: AUTHORIZED_BRANCH_ID,
      membershipLevel: 'level-3', levelSource: 'Одоогийн эх системийн түвшин', memberSince: '2025-03-17', activityState: 'watch',
      lastVisitAt: '2026-07-24T21:10:00+08:00', visits90d: 6, averageSpend: 1480000, minimumSpend: 720000, maximumSpend: 2460000,
      lifetimeValue: 19800000, monthlyEligibleSpend: [3900000, 2700000, 2280000], preferredVisitWindow: 'Лхагва, Баасан · 20:00–00:00',
      benefitUses90d: 1, cashbackBalance: 112000, consentedChannels: ['email'],
      affinities: [{ teamMemberId: 'tm-naraa', entertainerName: 'Мөнх Нараа', reservationCount: 3, sharePercent: 50 }],
      recentVisits: [
        { id: 'visit-8', date: '2026-07-24', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 1240000, entertainerName: 'Мөнх Нараа' },
        { id: 'visit-9', date: '2026-07-11', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 1040000, entertainerName: 'Мөнх Нараа' },
      ],
      dataFreshAt: '2026-08-13T12:52:00+08:00', sourceState: 'delayed',
    },
    {
      id: 'customer-5', displayName: 'Мөнх-Оргил Ц.', maskedPhone: '•••• 6407', branchId: AUTHORIZED_BRANCH_ID,
      membershipLevel: 'level-2', levelSource: 'Одоогийн эх системийн түвшин', memberSince: '2025-11-03', activityState: 'watch',
      lastVisitAt: '2026-07-18T22:05:00+08:00', visits90d: 4, averageSpend: 920000, minimumSpend: 610000, maximumSpend: 1320000,
      lifetimeValue: 8700000, monthlyEligibleSpend: [1800000, 1250000, 630000], preferredVisitWindow: 'Бямба · 22:00–01:00',
      benefitUses90d: 0, cashbackBalance: 48000, consentedChannels: [],
      affinities: [{ teamMemberId: 'tm-bolor', entertainerName: 'Эрдэнэ Болор', reservationCount: 2, sharePercent: 50 }],
      recentVisits: [{ id: 'visit-10', date: '2026-07-18', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 630000, entertainerName: 'Эрдэнэ Болор' }],
      dataFreshAt: '2026-08-13T13:08:00+08:00', sourceState: 'reconciled',
    },
    {
      id: 'customer-6', displayName: 'Ариунаа Г.', maskedPhone: '•••• 2289', branchId: AUTHORIZED_BRANCH_ID,
      membershipLevel: 'level-1', levelSource: 'Одоогийн эх системийн түвшин', memberSince: '2025-06-22', activityState: 'lapsed',
      lastVisitAt: '2026-05-04T19:45:00+08:00', visits90d: 1, averageSpend: 680000, minimumSpend: 680000, maximumSpend: 680000,
      lifetimeValue: 5300000, monthlyEligibleSpend: [680000, 0, 0], preferredVisitWindow: 'Ажлын өдөр · 19:00–22:00',
      benefitUses90d: 0, cashbackBalance: 19000, consentedChannels: ['telegram'],
      affinities: [],
      recentVisits: [{ id: 'visit-11', date: '2026-05-04', branchName: 'Төв салбар', status: 'completed', eligibleSpend: 680000 }],
      dataFreshAt: '2026-08-13T13:08:00+08:00', sourceState: 'reconciled',
    },
  ],
  entertainerRankings: [
    { teamMemberId: 'tm-anu', branchId: AUTHORIZED_BRANCH_ID, currentRank: 'Gold', rankEffectiveFrom: '2026-07-01', rankSource: 'Одоогийн профайлын зэрэглэл', attendancePercent: 98, unresolvedNoShows: 0, verifiedReservations: 18, repeatCustomers: 9, salesTrendPercent: 12, trainingCompleted: 3, openComplaints: 0, verifiedHistoryMonths: 8, dataQuality: 'complete', dataFreshAt: '2026-08-13T13:08:00+08:00' },
    { teamMemberId: 'tm-bolor', branchId: AUTHORIZED_BRANCH_ID, currentRank: 'Silver', rankEffectiveFrom: '2026-07-01', rankSource: 'Одоогийн профайлын зэрэглэл', attendancePercent: 94, unresolvedNoShows: 0, verifiedReservations: 13, repeatCustomers: 5, salesTrendPercent: 4, trainingCompleted: 2, openComplaints: 0, verifiedHistoryMonths: 6, dataQuality: 'complete', dataFreshAt: '2026-08-13T13:08:00+08:00' },
    { teamMemberId: 'tm-naraa', branchId: AUTHORIZED_BRANCH_ID, currentRank: 'Bronze', rankEffectiveFrom: '2026-07-01', rankSource: 'Одоогийн профайлын зэрэглэл', attendancePercent: 89, unresolvedNoShows: 1, verifiedReservations: 7, repeatCustomers: 2, salesTrendPercent: -6, trainingCompleted: 1, openComplaints: 1, verifiedHistoryMonths: 3, dataQuality: 'partial', dataFreshAt: '2026-08-13T12:52:00+08:00' },
    { teamMemberId: 'tm-solongo', branchId: AUTHORIZED_BRANCH_ID, currentRank: 'Diamond', rankEffectiveFrom: '2026-07-01', rankSource: 'Одоогийн профайлын зэрэглэл', attendancePercent: 99, unresolvedNoShows: 0, verifiedReservations: 24, repeatCustomers: 14, salesTrendPercent: 18, trainingCompleted: 4, openComplaints: 0, verifiedHistoryMonths: 12, dataQuality: 'complete', dataFreshAt: '2026-08-13T13:08:00+08:00' },
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
