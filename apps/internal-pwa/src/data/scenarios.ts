import type { AppSnapshot, DataMeta } from '../domain/types'
import { cloneSnapshot } from './fixtures'
import { validateAppSnapshot, validateFixtureReconciliation } from '../services/contractValidation'

export type ExecutiveScenarioKind =
  | 'healthy'
  | 'warning'
  | 'critical'
  | 'empty'
  | 'stale'
  | 'partial'
  | 'denied'
  | 'integration-failure'

export interface ExecutiveScenarioFixture {
  kind: ExecutiveScenarioKind
  label: string
  focusBranchId?: string
  access: 'allowed' | 'denied' | 'integration-failure'
  message: string
  snapshot: AppSnapshot
}

const mutateMeta = (snapshot: AppSnapshot, update: (meta: DataMeta, index: number) => void) => {
  const metas = [
    ...snapshot.branches.flatMap((branch) => [branch.meta, ...branch.drivers.map((driver) => driver.meta)]),
    ...snapshot.customers.map((item) => item.meta),
    ...snapshot.approvals.map((item) => item.meta),
    ...snapshot.recommendations.map((item) => item.meta),
    ...snapshot.settlements.map((item) => item.meta),
  ]
  metas.forEach(update)
}

const createSnapshot = (kind: ExecutiveScenarioKind): AppSnapshot => {
  const snapshot = cloneSnapshot()
  if (kind === 'empty') {
    snapshot.customers = []
    snapshot.approvals = []
    snapshot.tasks = []
    snapshot.threads = []
    snapshot.recommendations = []
    snapshot.settlements = []
    snapshot.auditEvents = []
  }
  if (kind === 'stale') {
    mutateMeta(snapshot, (meta) => {
      meta.updatedAt = '2026-08-10T08:20:00+08:00'
    })
  }
  if (kind === 'partial') {
    mutateMeta(snapshot, (meta, index) => {
      if (index % 2 === 0) {
        meta.mode = 'pending'
        meta.reconciled = false
      }
    })
  }
  return snapshot
}

const scenario = (
  kind: ExecutiveScenarioKind,
  label: string,
  message: string,
  options: Pick<ExecutiveScenarioFixture, 'focusBranchId' | 'access'>,
): ExecutiveScenarioFixture => ({ kind, label, message, ...options, snapshot: createSnapshot(kind) })

export const executiveScenarios: Record<ExecutiveScenarioKind, ExecutiveScenarioFixture> = {
  healthy: scenario('healthy', 'Хэвийн салбар', 'Empire Lounge хэвийн гүйцэтгэлийн төлөв.', { focusBranchId: 'empire', access: 'allowed' }),
  warning: scenario('warning', 'Анхаарах салбар', 'Platinum Night Club анхаарах төлөв.', { focusBranchId: 'platinum', access: 'allowed' }),
  critical: scenario('critical', 'Ноцтой салбар', 'Queen Club ноцтой төлөв.', { focusBranchId: 'queen', access: 'allowed' }),
  empty: scenario('empty', 'Хоосон төлөв', 'Сонгосон шүүлтүүрт мэдээлэл олдсонгүй.', { access: 'allowed' }),
  stale: scenario('stale', 'Хуучирсан төлөв', 'Мэдээллийн шинэчлэлт хоцорсон тул freshness анхааруулга харагдана.', { access: 'allowed' }),
  partial: scenario('partial', 'Хэсэгчилсэн төлөв', 'Зарим эх үүсвэрийн тулгалт дуусаагүй.', { access: 'allowed' }),
  denied: scenario('denied', 'Хандах эрхгүй', 'Энэ мэдээллийг харах эрхгүй.', { access: 'denied' }),
  'integration-failure': scenario('integration-failure', 'Интеграцийн алдаа', 'Integration pending — эх системтэй холбогдож чадсангүй.', { access: 'integration-failure' }),
}

export function validateExecutiveScenarios(): void {
  const kinds: ExecutiveScenarioKind[] = ['healthy', 'warning', 'critical', 'empty', 'stale', 'partial', 'denied', 'integration-failure']
  for (const kind of kinds) {
    const fixture = executiveScenarios[kind]
    if (!fixture || fixture.kind !== kind || !fixture.label.trim() || !fixture.message.trim()) {
      throw new Error(`Executive scenario ${kind} is incomplete.`)
    }
    validateAppSnapshot(fixture.snapshot, 'fixture')
    validateFixtureReconciliation(fixture.snapshot)
  }

  for (const kind of ['healthy', 'warning', 'critical'] as const) {
    const fixture = executiveScenarios[kind]
    if (!fixture.snapshot.branches.some((branch) => branch.id === fixture.focusBranchId && branch.severity === (kind === 'warning' ? 'attention' : kind))) {
      throw new Error(`${kind} scenario must point to a matching four-branch record.`)
    }
  }
}
