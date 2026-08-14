import { beforeEach, describe, expect, it } from 'vitest'
import { BrowserManagerOperationsService, resetManagerOperationsPrototype } from './managerOperationsService'

describe('Manager task and sales-goal operations', () => {
  beforeEach(() => resetManagerOperationsPrototype())

  it('enforces the manager branch scope for operations', () => {
    const service = new BrowserManagerOperationsService()

    expect(service.getSnapshot().branchId).toBe('branch-central')
    expect(() => service.getSnapshot('branch-west')).toThrow('Энэ салбарт хандах эрхгүй байна.')
    expect(() => service.createTask({ branchId: 'branch-west', title: 'Туршилт', description: 'Тайлбар', assigneeId: 'tm-anu', dueDate: '2026-08-20' })).toThrow('Энэ салбарт хандах эрхгүй байна.')
    expect(() => service.createTask({ branchId: 'branch-central', title: 'Туршилт', description: 'Тайлбар', assigneeId: 'other-branch-member', dueDate: '2026-08-20' })).toThrow('Зөвхөн өөрийн салбарын идэвхтэй багийн гишүүнд даалгавар өгнө.')
  })

  it('retains acknowledgement, evidence, rework, approval, comments, and audit history', () => {
    const service = new BrowserManagerOperationsService()
    const created = service.createTask({ branchId: 'branch-central', title: 'Шинэ шалгалт', description: 'Тодорхой үр дүн гаргана.', assigneeId: 'tm-anu', dueDate: '2026-08-20' })
    const taskId = created.tasks[0].id

    expect(created.tasks[0].status).toBe('assigned')
    expect(created.tasks[0].audit.map((item) => item.action)).toContain('notification-recorded')

    service.acknowledgeTask(taskId, 'tm-anu')
    service.startTask(taskId, 'tm-anu')
    service.submitTask(taskId, 'tm-anu', 'Эхний үр дүн', { fileName: 'barimt.jpg', mimeType: 'image/jpeg', size: 120_000 })
    service.reviewTask(taskId, 'rework', 'Зурагт огноог тодорхой харуулна уу.')
    service.startTask(taskId, 'tm-anu')
    service.submitTask(taskId, 'tm-anu', 'Зассан үр дүн')
    service.addTaskComment(taskId, 'Эцсийн баримтыг шалгав.')
    const completed = service.reviewTask(taskId, 'approve', 'Үр дүн шаардлага хангасан.')
    const task = completed.tasks.find((item) => item.id === taskId)!

    expect(task.status).toBe('completed')
    expect(task.evidence).toHaveLength(1)
    expect(task.comments.map((item) => item.body)).toEqual(expect.arrayContaining(['Зурагт огноог тодорхой харуулна уу.', 'Эцсийн баримтыг шалгав.', 'Үр дүн шаардлага хангасан.']))
    expect(task.audit.map((item) => item.action)).toEqual(expect.arrayContaining(['acknowledged', 'started', 'submitted', 'rework-requested', 'commented', 'approved']))
  })

  it('lets the manager submit a proposal without granting CEO approval authority', () => {
    const service = new BrowserManagerOperationsService()
    const proposal = service.getSnapshot().goalProposal
    const saved = service.saveGoalProposal({
      proposedTarget: 165_000_000,
      rationale: 'Тулгагдсан суурь болон батлагдсан өсөлтийн хувийг хянав.',
      actions: proposal.actions,
    })

    expect(saved.goalProposal.proposedTarget).toBe(165_000_000)
    expect(saved.goalProposal.state).toBe('draft')

    const submitted = service.submitGoalProposal()
    expect(submitted.goalProposal.state).toBe('submitted')
    expect(submitted.goalProposal.version).toBe(2)
    expect(submitted.goalProposal.audit.at(-1)?.action).toBe('submitted')
    expect(submitted.goalProposal).not.toHaveProperty('approve')
    expect(() => service.saveGoalProposal({ proposedTarget: 1, rationale: 'Засах', actions: proposal.actions })).toThrow('Илгээсэн төлөвлөгөөг засах боломжгүй')
  })
})
