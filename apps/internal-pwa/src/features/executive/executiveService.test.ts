import { beforeEach, describe, expect, it } from 'vitest'
import { demoCeoSession, demoManagerSession } from '../../shared/managementAccess'
import { BrowserManagerBusinessService, resetManagerBusinessPrototype } from '../workforce/managerBusinessService'
import { BrowserManagerOperationsService, resetManagerOperationsPrototype } from '../workforce/managerOperationsService'
import { resetWorkforcePrototype } from '../workforce/workforceService'
import { BrowserExecutiveService } from './executiveService'

describe('CEO and Manager shared decision flow', () => {
  beforeEach(() => {
    resetManagerOperationsPrototype()
    resetManagerBusinessPrototype()
    resetWorkforcePrototype()
  })

  it('denies company data and decision methods to a Manager session', () => {
    const service = new BrowserExecutiveService(demoManagerSession)
    expect(() => service.getSnapshot()).toThrow('эрх таны үүрэгт олгогдоогүй')
  })

  it('moves a Manager goal proposal through the CEO decision and back to the Manager state', () => {
    const managerService = new BrowserManagerOperationsService()
    const submitted = managerService.submitGoalProposal()
    const executiveService = new BrowserExecutiveService(demoCeoSession)

    expect(executiveService.getSnapshot().operations.goalProposal.state).toBe('submitted')
    executiveService.reviewGoalProposal(submitted.goalProposal.id, 'approve', 'Суурь болон хэрэгжүүлэх ажлууд шаардлага хангасан.')

    const managerView = managerService.getSnapshot()
    expect(managerView.goalProposal.state).toBe('approved')
    expect(managerView.goalProposal.ceoComment).toBe('Суурь болон хэрэгжүүлэх ажлууд шаардлага хангасан.')
    expect(managerView.goalProposal.audit.at(-1)?.actor).toBe(demoCeoSession.displayName)
  })

  it('returns a ranking recommendation to the Manager with the CEO comment', () => {
    const managerService = new BrowserManagerBusinessService()
    const recommendation = managerService.getSnapshot().recommendations.find((item) => item.status === 'submitted')!
    const executiveService = new BrowserExecutiveService(demoCeoSession)

    executiveService.reviewRecommendation(recommendation.id, 'revision', 'Нэмэлт 14 хоногийн ирцийн нотолгоо хавсаргана уу.')

    const managerView = managerService.getSnapshot().recommendations.find((item) => item.id === recommendation.id)
    expect(managerView?.status).toBe('revision-requested')
    expect(managerView?.decisionComment).toBe('Нэмэлт 14 хоногийн ирцийн нотолгоо хавсаргана уу.')
  })
})
