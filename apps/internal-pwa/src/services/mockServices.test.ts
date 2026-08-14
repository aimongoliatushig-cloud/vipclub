import { describe, expect, it } from 'vitest'
import { createMockServices } from './mockServices'

describe('CEO mock service boundary', () => {
  it('rejects an approval decision without a reason and preserves pending state', async () => {
    const services = createMockServices()

    await expect(
      services.approvals.decide('apr-membership', { status: 'approved', reason: '   ', expectedUpdatedAt: '' }),
    ).rejects.toThrow('Шийдвэрийн үндэслэл')

    const approval = (await services.approvals.list()).find((item) => item.id === 'apr-membership')
    expect(approval?.status).toBe('pending')
  })

  it('approves a settlement once, changes its batch state, and records the reason', async () => {
    const services = createMockServices()
    const sourceVersion = (await services.approvals.list()).find((item) => item.id === 'apr-settlement')?.meta.updatedAt ?? ''

    const decision = await services.approvals.decide('apr-settlement', {
      status: 'approved',
      reason: 'Нягтлангийн хяналт болон хоёр exception-ийг шалгав.',
      expectedUpdatedAt: sourceVersion,
    })

    expect(decision.status).toBe('approved')
    expect((await services.settlements.list())[0].status).toBe('approved')
    expect((await services.audit.list())[0].reason).toContain('хоёр exception')
    expect((await services.audit.list())[0].summary).toContain(sourceVersion)
    await expect(
      services.approvals.decide('apr-settlement', { status: 'rejected', reason: 'Давхар оролдлого', expectedUpdatedAt: sourceVersion }),
    ).rejects.toThrow('өмнө нь шийдвэрлэсэн')
  })

  it('rejects a stale approval version without mutating state or adding an audit decision', async () => {
    const services = createMockServices()
    const auditCount = (await services.audit.list()).length

    await expect(services.approvals.decide('apr-membership', {
      status: 'approved',
      reason: 'Хуучирсан queue дээрх оролдлого.',
      expectedUpdatedAt: 'stale-version',
    })).rejects.toThrow('мэдээлэл шинэчлэгдсэн')

    expect((await services.approvals.list()).find((item) => item.id === 'apr-membership')?.status).toBe('pending')
    expect(await services.audit.list()).toHaveLength(auditCount)
  })

  it('blocks self-approval and unreconciled source data at the service boundary', async () => {
    const reviewerServices = createMockServices({
      actor: 'Г. Болормаа',
      role: 'CEO',
      branchIds: ['queen', 'empire', 'platinum', 'gobi'],
      companyWide: true,
    })
    const rankApproval = (await reviewerServices.approvals.list()).find((item) => item.id === 'apr-rank')

    await expect(reviewerServices.approvals.decide('apr-rank', {
      status: 'approved',
      reason: 'Өөрийн хянасан материалыг шийдэх оролдлого.',
      expectedUpdatedAt: rankApproval?.meta.updatedAt ?? '',
    })).rejects.toThrow('Өөрийн хүсэлт эсвэл өөрийн хянасан')

    const services = createMockServices()
    const loanApproval = (await services.approvals.list()).find((item) => item.id === 'apr-loan')
    const auditCount = (await services.audit.list()).length
    await expect(services.approvals.decide('apr-loan', {
      status: 'approved',
      reason: 'Дутуу өгөгдөлтэй шийдвэрийн оролдлого.',
      expectedUpdatedAt: loanApproval?.meta.updatedAt ?? '',
    })).rejects.toThrow('Эх өгөгдлийн тулгалт дутуу')
    expect((await services.approvals.list()).find((item) => item.id === 'apr-loan')?.status).toBe('pending')
    expect(await services.audit.list()).toHaveLength(auditCount)
  })

  it('supports retain and authorized override as versioned, reasoned CEO decisions', async () => {
    const retainServices = createMockServices()
    const membership = (await retainServices.approvals.list()).find((item) => item.id === 'apr-membership')
    const retained = await retainServices.approvals.decide('apr-membership', {
      status: 'retained',
      reason: 'Одоогийн Gold түвшнийг policy батлагдах хүртэл үлдээнэ.',
      expectedUpdatedAt: membership?.meta.updatedAt ?? '',
    })
    expect(retained.status).toBe('retained')
    expect(retained.history.at(-1)?.action).toContain('retained')

    const overrideServices = createMockServices()
    const rank = (await overrideServices.approvals.list()).find((item) => item.id === 'apr-rank')
    await expect(overrideServices.approvals.decide('apr-rank', {
      status: 'overridden',
      reason: 'Зөвшөөрөгдөөгүй override value туршив.',
      expectedUpdatedAt: rank?.meta.updatedAt ?? '',
      overrideValue: 'Rank 9',
    })).rejects.toThrow('зөвшөөрөгдсөн үр дүн')

    const overridden = await overrideServices.approvals.decide('apr-rank', {
      status: 'overridden',
      reason: 'Нотолгоо болон downstream нөлөөг хянаж Rank 2-ыг үлдээв.',
      expectedUpdatedAt: rank?.meta.updatedAt ?? '',
      overrideValue: 'Rank 2',
    })
    expect(overridden.status).toBe('overridden')
    expect(overridden.overrideValue).toBe('Rank 2')
    expect(overridden.history.at(-1)?.action).toContain('Rank 2')
    expect((await overrideServices.audit.list())[0].summary).toContain('override Rank 2')
  })

  it('blocks a cross-branch decision for a branch-scoped CEO context', async () => {
    const services = createMockServices({
      actor: 'Баттүшиг',
      role: 'CEO',
      branchIds: ['empire'],
      companyWide: false,
    })

    await expect(services.approvals.decide('apr-membership', {
      status: 'approved',
      reason: 'Хүрээнээс гадуур шийдвэрийн оролдлого.',
      expectedUpdatedAt: '2026-08-12T08:20:00+08:00',
    })).rejects.toThrow('хандах эрхгүй')
  })

  it('updates a branch target through the contract and emits an audit event', async () => {
    const services = createMockServices()

    const updated = await services.branches.updateTarget('queen', 27.5)

    expect(updated.salesTarget).toBe(27.5)
    expect((await services.branches.list()).find((item) => item.id === 'queen')?.salesTarget).toBe(27.5)
    expect((await services.audit.list())[0].target).toContain('27.5')
    await expect(services.branches.updateTarget('queen', 0)).rejects.toThrow('0-ээс их')
  })

  it('converts a Hermes recommendation into a traceable manager task', async () => {
    const services = createMockServices()
    const taskCount = (await services.tasks.list()).length

    const result = await services.hermes.act('hermes-1', 'converted')

    expect(result.recommendation.status).toBe('converted')
    expect(result.task).toMatchObject({ branchId: 'queen', module: 'Hermes', status: 'assigned' })
    expect((await services.tasks.list())).toHaveLength(taskCount + 1)
    expect((await services.audit.list())[0]).toMatchObject({ action: 'Hermes зөвлөмж: converted', branchId: 'queen' })
  })

  it('creates an authorized manager conversation with source context and audit evidence', async () => {
    const services = createMockServices()
    const threadCount = (await services.messaging.list()).length

    const thread = await services.messaging.create({
      title: 'Queen Club · Борлуулалтын хурд −20%',
      participant: 'Г. Тэмүүлэн',
      participantRole: 'Салбарын менежер',
      branchId: 'queen',
      kind: 'normal',
      context: 'Queen Club · Branch Health 62/100 · POS daily sales',
      body: 'Одоогийн нөхцөл болон авах арга хэмжээг шинэчилнэ үү.',
    })

    expect(thread).toMatchObject({ branchId: 'queen', participant: 'Г. Тэмүүлэн', unread: 0 })
    expect(thread).toMatchObject({ scope: 'branch', status: 'active', accessStatus: 'active', audience: 'internal' })
    expect(thread.participants).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Баттүшиг', role: 'CEO', access: 'active' }),
      expect.objectContaining({ name: 'Г. Тэмүүлэн', role: 'Салбарын менежер', access: 'active' }),
    ]))
    expect(thread.messages[0]).toMatchObject({ sender: 'Баттүшиг', mine: true, read: false, delivery: 'delivered', attachments: [] })
    expect((await services.messaging.list())).toHaveLength(threadCount + 1)
    expect((await services.audit.list())[0]).toMatchObject({ action: 'Удирдлагын яриа үүсгэсэн', branchId: 'queen' })
  })

  it('enforces restricted membership and redacted sensitive access audit', async () => {
    const managerServices = createMockServices({
      actor: 'Г. Тэмүүлэн',
      role: 'Branch Manager',
      branchIds: ['queen'],
      companyWide: false,
    })

    expect((await managerServices.messaging.list()).every((thread) => thread.kind !== 'sensitive' && thread.kind !== 'anonymous')).toBe(true)
    await expect(managerServices.messaging.create({
      title: 'Restricted оролдлого',
      participant: 'Ажилтан',
      participantRole: 'Ажилтан',
      branchId: 'queen',
      kind: 'sensitive',
      body: 'Нууц мэдээлэл',
    })).rejects.toThrow('зөвхөн CEO')

    const services = createMockServices()
    const opened = await services.messaging.open('thread-sensitive')
    expect(opened.auditTrail.at(-1)).toMatchObject({ actor: 'Баттүшиг', action: 'Яриа нээсэн' })
    expect((await services.audit.list())[0]).toMatchObject({ domain: 'SensitiveMessaging', summary: 'Restricted content redacted' })
  })

  it('guards revoked, retained, deleted and stale threads while preserving delivery evidence', async () => {
    const services = createMockServices()
    const threads = await services.messaging.list()

    expect(threads.find((thread) => thread.id === 'thread-delivery-failed')?.messages.at(-1)?.delivery).toBe('failed')
    expect(threads.find((thread) => thread.id === 'thread-sensitive')?.messages[0].attachments[0]).toMatchObject({ status: 'denied' })
    expect(threads.find((thread) => thread.id === 'thread-deleted')).toMatchObject({ status: 'deleted', messages: [] })
    await expect(services.messaging.send('thread-revoked', 'Хандалтын оролдлого')).rejects.toThrow('хандалт цуцлагдсан')
    await expect(services.messaging.send('thread-retained', 'Legal hold зөрчих оролдлого')).rejects.toThrow('идэвхтэй төлөвт биш')
    await expect(services.messaging.send('thread-delivery-failed', 'Stale thread оролдлого')).rejects.toThrow('идэвхтэй төлөвт биш')
  })

  it('preserves every workforce state and labels advisory forecast assumptions and partial data', async () => {
    const services = createMockServices()
    const workforce = await services.workforce.list()
    const states = new Set(workforce.flatMap((snapshot) => snapshot.statusCounts.map((item) => item.state)))

    expect(states).toEqual(new Set(['scheduled', 'available', 'reserved', 'serving', 'break', 'late', 'absent', 'leave', 'uncovered', 'stale', 'unknown']))
    expect(workforce).toHaveLength(4)
    expect(workforce.every((snapshot) => snapshot.coverageGaps.every((gap) => gap.evidence.length > 0 && gap.sourceRecord))).toBe(true)
    expect(workforce.flatMap((snapshot) => snapshot.forecast).some((forecast) => forecast.dataState === 'partial' && forecast.missingData.length > 0)).toBe(true)
    expect(workforce.flatMap((snapshot) => snapshot.forecast).every((forecast) => forecast.assumptions.length > 0 && forecast.sourceRecord)).toBe(true)
  })

  it('keeps manager reporting explainable and employee detail CEO-only with masked audit evidence', async () => {
    const services = createMockServices()
    const managers = await services.people.listManagers()

    expect(managers.every((manager) => manager.automatedDecision === false)).toBe(true)
    expect(managers.every((manager) => manager.metricEvidence.length === 6 && manager.metricEvidence.every((metric) => metric.sourceRecord && metric.updatedAt))).toBe(true)
    expect(managers.every((manager) => manager.events.some((event) => event.type === 'acknowledgement'))).toBe(true)

    const employee = await services.people.openEmployee('demo-employee-1')
    expect(employee).toMatchObject({ maskedEmployeeCode: 'EMP-•••-1042', sensitiveFieldsMasked: true, accessAuditRequired: true })
    expect(employee.approvedFields).not.toContain('Phone')
    expect((await services.audit.list())[0]).toMatchObject({ domain: 'EmployeePerformance', target: 'EMP-•••-1042', summary: expect.stringContaining('sensitive fields masked') })

    const managerServices = createMockServices({ actor: 'Г. Тэмүүлэн', role: 'Branch Manager', branchIds: ['queen'], companyWide: false })
    expect(await managerServices.people.listEmployees()).toEqual([])
    await expect(managerServices.people.openEmployee('demo-employee-1')).rejects.toThrow('CEO эрх шаардлагатай')
    await expect(managerServices.people.openEmployee('demo-employee-3')).rejects.toThrow('олдсонгүй эсвэл хандах эрхгүй')
  })

  it('returns source-backed daily and monthly Hermes read models with every explicit analysis state', async () => {
    const services = createMockServices()
    const daily = await services.hermes.daily()
    const monthly = await services.hermes.monthly()
    const recommendations = await services.hermes.list()

    expect(new Set(daily.items.map((item) => item.domain))).toEqual(new Set(['branch', 'sales', 'customer', 'workforce', 'task', 'approval', 'exception']))
    expect(daily.items.every((item) => item.sourceRecord && item.updatedAt && item.href)).toBe(true)
    expect(monthly.branches).toHaveLength(4)
    expect(monthly.branches.every((item) => item.target && item.plan && item.execution && item.outcome && item.unresolvedRisk && item.priorRecommendationResult && item.sourceRecords.length)).toBe(true)
    expect(new Set(recommendations.map((item) => item.analysisState))).toEqual(new Set(['ready', 'empty', 'conflicting-source', 'stale', 'low-confidence', 'unavailable', 'unsafe-action']))
    expect(recommendations.every((item) => item.isAuthoritative === false && item.evidence.every((evidence) => evidence.authorized))).toBe(true)
  })

  it('retains Hermes annotations and usefulness feedback separately from business status', async () => {
    const services = createMockServices()
    const before = (await services.hermes.open('hermes-2')).status
    const annotated = await services.hermes.annotate('hermes-2', 'Role/time gap source-ийг менежертэй дахин шалгана.')
    const reviewed = await services.hermes.feedback('hermes-2', { usefulness: 'useful', accuracy: 'uncertain', note: 'Late state өөрчлөгдөж болно.' })

    expect(annotated.annotations.at(-1)).toMatchObject({ actor: 'Баттүшиг', body: expect.stringContaining('Role/time gap') })
    expect(reviewed.feedback.at(-1)).toMatchObject({ usefulness: 'useful', accuracy: 'uncertain' })
    expect(reviewed.status).toBe(before)
    expect((await services.audit.list()).slice(0, 3).map((item) => item.action)).toEqual(expect.arrayContaining(['Hermes feedback хадгалсан', 'Hermes annotation нэмсэн', 'Hermes зөвлөмж нээсэн']))
  })

  it('creates an authorized Hermes discussion but blocks unsafe task conversion and non-CEO actions', async () => {
    const services = createMockServices()
    const thread = await services.hermes.openConversation('hermes-2')

    expect(thread).toMatchObject({ kind: 'hermes', branchId: 'queen', context: 'Recommendation hermes-2' })
    expect(thread.messages[0].body).toContain('Sensitive болон зөвшөөрөлгүй field оруулаагүй')
    await expect(services.hermes.act('hermes-6', 'converted')).rejects.toThrow('business task үүсгэх нь хаалттай')
    expect((await services.approvals.list()).every((item) => item.status === 'pending')).toBe(true)

    const managerServices = createMockServices({ actor: 'Г. Тэмүүлэн', role: 'Branch Manager', branchIds: ['queen'], companyWide: false })
    await expect(managerServices.hermes.annotate('hermes-2', 'Manager annotation')).rejects.toThrow('CEO эрх шаардлагатай')
    await expect(managerServices.hermes.openConversation('hermes-2')).rejects.toThrow('CEO эрх шаардлагатай')
  })

  it('records a purpose-bound report audit event and rejects an empty reason', async () => {
    const services = createMockServices()

    await expect(services.audit.record({
      domain: 'Reports',
      action: 'Export хүсэлт үүсгэсэн',
      target: 'Branch Health тайлан',
      reason: '   ',
    })).rejects.toThrow('Audit event-ийн зорилго эсвэл үндэслэл')

    const event = await services.audit.record({
      domain: 'Reports',
      action: 'Export хүсэлт үүсгэсэн',
      target: 'Branch Health тайлан',
      branchId: 'queen',
      reason: 'CEO review-д ашиглана.',
      summary: 'CSV · Visible scope only · PII masked',
      exportControl: { format: 'csv', estimatedRows: 84, scope: 'current-authorized-view', masked: true, outcome: 'allowed' },
    })

    expect(event).toMatchObject({
      domain: 'Reports',
      action: 'Export хүсэлт үүсгэсэн',
      target: 'Branch Health тайлан',
      branchId: 'queen',
      reason: 'CEO review-д ашиглана.',
      summary: 'CSV · Visible scope only · PII masked',
      exportControl: { format: 'csv', estimatedRows: 84, scope: 'current-authorized-view', masked: true, outcome: 'allowed' },
    })
    expect((await services.audit.list())[0].id).toBe(event.id)
  })

  it('enforces large-result and rate controls while auditing denied report exports', async () => {
    const services = createMockServices()

    await expect(services.audit.record({
      domain: 'Reports',
      action: 'Export хүсэлт үүсгэсэн',
      target: 'Executive audit archive',
      reason: 'CEO review',
      exportControl: { format: 'csv', estimatedRows: 5_420, scope: 'current-authorized-view', masked: true, outcome: 'allowed' },
    })).rejects.toThrow('Large-result export хориглогдлоо')

    const denied = await services.audit.record({
      domain: 'Reports',
      action: 'Export хориглосон',
      target: 'Executive audit archive',
      reason: 'CEO review',
      eventType: 'action',
      exportControl: { format: 'csv', estimatedRows: 5_420, scope: 'current-authorized-view', masked: true, outcome: 'denied' },
    })
    expect(denied.exportControl?.outcome).toBe('denied')

    for (let index = 0; index < 3; index += 1) {
      await services.audit.record({
        domain: 'Reports',
        action: 'Export хүсэлт үүсгэсэн',
        target: `Rate test ${index}`,
        reason: 'CEO review',
        exportControl: { format: 'pdf', estimatedRows: 10, scope: 'current-authorized-view', masked: true, outcome: 'allowed' },
      })
    }
    await expect(services.audit.record({
      domain: 'Reports',
      action: 'Export хүсэлт үүсгэсэн',
      target: 'Rate test blocked',
      reason: 'CEO review',
      exportControl: { format: 'pdf', estimatedRows: 10, scope: 'current-authorized-view', masked: true, outcome: 'allowed' },
    })).rejects.toThrow('Export rate control')
  })

  it('keeps audit history append-only and records corrections as linked adjustments', async () => {
    const services = createMockServices()
    const before = await services.audit.list()
    const source = before.find((item) => item.id === 'audit-1')
    expect(source?.target).toBe('Queen Club · 2026-08')

    const correction = await services.audit.record({
      domain: 'Operations',
      action: 'Зорилтын дүнгийн засвар',
      target: 'Queen Club · 2026-08',
      branchId: 'queen',
      reason: 'Батлагдсан эх баримтаар залруулсан',
      eventType: 'adjustment',
      before: '₮255,000,000',
      after: '₮257,000,000',
      reversesEventId: 'audit-1',
    })

    expect(correction).toMatchObject({ eventType: 'adjustment', reversesEventId: 'audit-1' })
    expect((await services.audit.list()).find((item) => item.id === 'audit-1')).toEqual(source)
  })

  it('enforces branch scope at the service boundary and hides company-wide records', async () => {
    const services = createMockServices({
      actor: 'Г. Тэмүүлэн',
      role: 'Branch Manager',
      branchIds: ['queen'],
      companyWide: false,
    })

    expect((await services.branches.list()).map((item) => item.id)).toEqual(['queen'])
    expect((await services.customers.list()).every((item) => item.branchId === 'queen')).toBe(true)
    expect((await services.approvals.list()).every((item) => item.branchId === 'queen')).toBe(true)
    expect(await services.settlements.list()).toEqual([])

    const ownApproval = (await services.approvals.list())[0]
    await expect(services.approvals.decide(ownApproval.id, {
      status: 'approved',
      reason: 'Manager final decision attempt.',
      expectedUpdatedAt: ownApproval.meta.updatedAt,
    })).rejects.toThrow('зөвхөн CEO')

    await expect(services.branches.updateTarget('empire', 30)).rejects.toThrow('хандах эрхгүй')
    await expect(services.tasks.create({
      title: 'Company-wide task',
      instruction: 'Scope-гүй record үүсгэх оролдлого.',
      assignee: 'Operations',
      assigneeRole: 'Manager',
      module: 'Operations',
      dueAt: '2026-08-13T18:00:00+08:00',
      priority: 'high',
    })).rejects.toThrow('хандах эрхгүй')

    const event = await services.audit.record({
      domain: 'Branches',
      action: 'Scope test',
      target: 'Queen Club',
      branchId: 'queen',
      reason: 'Authorized own-branch action.',
    })
    expect(event).toMatchObject({ actor: 'Г. Тэмүүлэн', role: 'Branch Manager', branchId: 'queen' })
  })

  it('lets CEO inspect every branch setting and records an effective-dated override', async () => {
    const services = createMockServices()
    const settings = await services.branchSettings.list()
    expect(new Set(settings.map((item) => item.branchId))).toEqual(new Set(['queen', 'empire', 'platinum', 'gobi']))

    const operatingHours = settings.find((item) => item.id === 'empire-profile-operating-hours')!
    const updated = await services.branchSettings.update('empire', operatingHours.id, {
      value: '19:00–05:00',
      reason: 'CEO салбарын баталгаажсан цагийг шинэчилсэн.',
      effectiveFrom: '2026-08-14',
      expectedVersion: operatingHours.version,
    })

    expect(updated).toMatchObject({ value: '19:00–05:00', version: 2, origin: 'ceo-override', status: 'scheduled' })
    expect(updated.history[0]).toMatchObject({ role: 'CEO', action: 'override', before: '18:00–04:00', after: '19:00–05:00', version: 2 })
    expect((await services.audit.list())[0]).toMatchObject({ domain: 'BranchSettings', branchId: 'empire', before: '18:00–04:00', after: '19:00–05:00' })
  })

  it('restricts branch managers to their own editable settings and queues high-impact policy for CEO', async () => {
    const services = createMockServices({ actor: 'Г. Тэмүүлэн', role: 'Branch Manager', branchIds: ['queen'], companyWide: false })
    const settings = await services.branchSettings.list()
    expect(settings.length).toBeGreaterThan(10)
    expect(settings.every((item) => item.branchId === 'queen')).toBe(true)

    const membership = settings.find((item) => item.id === 'queen-membership-expenditure-ranges')!
    const proposed = await services.branchSettings.update('queen', membership.id, {
      value: 'Bronze 0–499k · Silver 500k–999k · CEO review required',
      reason: 'Салбарын бодит худалдан авалтын тархалтад үндэслэв.',
      effectiveFrom: '2026-09-01',
      expectedVersion: membership.version,
    })
    expect(proposed).toMatchObject({ status: 'pending-approval', origin: 'branch', version: 2 })
    expect(proposed.history[0]).toMatchObject({ role: 'Branch Manager', action: 'submitted' })

    const locked = settings.find((item) => item.id === 'queen-governance-health-weights')!
    await expect(services.branchSettings.update('queen', locked.id, {
      value: '25 / 25 / 25 / 15 / 10',
      reason: 'Manager override attempt.',
      effectiveFrom: '2026-09-01',
      expectedVersion: locked.version,
    })).rejects.toThrow('Approved company-wide policy')
    await expect(services.branchSettings.update('empire', 'empire-profile-operating-hours', {
      value: '19:00–05:00',
      reason: 'Cross-branch attempt.',
      effectiveFrom: '2026-09-01',
      expectedVersion: 1,
    })).rejects.toThrow('хандах эрхгүй')
  })
})
