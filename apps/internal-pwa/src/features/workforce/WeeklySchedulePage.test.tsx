import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { WeeklySchedulePage } from './WeeklySchedulePage'
import { BrowserWorkforceService, resetWorkforcePrototype } from './workforceService'

describe('WeeklySchedulePage', () => {
  beforeEach(() => resetWorkforcePrototype())

  it('shows branch-scoped roster, coverage, and publication review', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Weekly schedule' }))

    expect(screen.getByRole('heading', { name: 'Weekly schedule' })).toBeInTheDocument()
    expect(screen.getByText('Authorized branch scope')).toBeInTheDocument()
    expect(screen.getByText('Open coverage gaps')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Review & publish' }))
    expect(screen.getByRole('dialog', { name: /Week of/ })).toBeInTheDocument()
    expect(screen.getByText(/^2 coverage gaps$/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Reason for publishing below minimum/)).toBeInTheDocument()
  })

  it('adds a draft shift from an empty team-member day', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Weekly schedule' }))

    const addButtons = screen.getAllByRole('button', { name: /Add Anu Bat shift/ })
    await user.click(addButtons[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Shift'), 'Day')
    await user.click(screen.getByRole('button', { name: /Save shift/i }))

    expect(screen.getByRole('status')).toHaveTextContent('Draft shift saved')
  })

  it('edits staffing requirements and exposes the resulting audit evidence', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Weekly schedule' }))

    await user.click(screen.getByRole('button', { name: /Staffing requirements/ }))
    expect(screen.getByRole('dialog', { name: 'Minimum people required' })).toBeInTheDocument()
    const bartenderRequirement = screen.getAllByRole('spinbutton', { name: /Bartender required/ })[0]
    await user.clear(bartenderRequirement)
    await user.type(bartenderRequirement, '2')
    await user.type(screen.getByLabelText(/Reason for change/), 'Monday event needs a second bartender.')
    await user.click(screen.getByRole('button', { name: /Save requirements/ }))

    expect(screen.getByRole('status')).toHaveTextContent('version 2')
    await user.click(screen.getByRole('button', { name: /Audit evidence/ }))
    expect(screen.getByRole('dialog', { name: 'Complete audit trail' })).toHaveTextContent('Staffing requirements updated')
  })

  it('records a CEO follow-up task from objective schedule evidence', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Weekly schedule' }))

    await user.click(screen.getByRole('button', { name: /CEO follow-up/ }))
    const dialog = screen.getByRole('dialog', { name: 'Branch follow-up' })
    expect(dialog).toHaveTextContent('This does not infer effort from missing activity')
    expect(dialog).toHaveTextContent('Last recorded manager action')
    await user.click(screen.getByRole('button', { name: 'Create follow-up task' }))
    await user.click(screen.getByRole('button', { name: 'Create task' }))

    expect(screen.getByRole('status')).toHaveTextContent('CEO follow-up task recorded')
    expect(dialog).toHaveTextContent('Latest: task due')
  })

  it('keeps draft assignments private from the team-member preview', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Weekly schedule' }))

    await user.click(screen.getByRole('button', { name: /Response queue/ }))
    expect(screen.getByRole('dialog', { name: 'Assignment responses' })).toHaveTextContent('Responses begin after publication')
    await user.click(screen.getByRole('button', { name: 'Open team-member preview' }))
    expect(screen.getByRole('dialog', { name: 'My published schedule' })).toHaveTextContent('No published schedule yet')
  })

  it('routes a team-member change request into the manager response queue', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Weekly schedule' }))

    await user.click(screen.getByRole('button', { name: 'Review & publish' }))
    await user.type(screen.getByLabelText(/Reason for publishing below minimum/), 'Two approved gaps are being backfilled.')
    await user.click(screen.getByRole('button', { name: 'Publish roster' }))
    await user.click(screen.getByRole('button', { name: /Response queue/ }))
    expect(screen.getByRole('dialog', { name: 'Assignment responses' })).toHaveTextContent('42')
    await user.click(screen.getByRole('button', { name: 'Open team-member preview' }))
    await user.click(screen.getAllByRole('button', { name: 'Request change' })[0])
    await user.type(screen.getByLabelText('Why do you need a change?'), 'Class ends after this shift starts.')
    await user.click(screen.getByRole('button', { name: 'Submit request' }))

    expect(screen.getByRole('status')).toHaveTextContent('change request added')
    await user.click(screen.getByRole('button', { name: 'Close team-member schedule preview' }))
    await user.click(screen.getByRole('button', { name: /Response queue/ }))
    const queue = screen.getByRole('dialog', { name: 'Assignment responses' })
    expect(queue).toHaveTextContent('Change requested')
    expect(queue).toHaveTextContent('Class ends after this shift starts.')
  }, 10_000)

  it('records acknowledgement and reminder evidence without changing roster version', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Weekly schedule' }))

    await user.click(screen.getByRole('button', { name: 'Review & publish' }))
    await user.type(screen.getByLabelText(/Reason for publishing below minimum/), 'Two approved gaps are being backfilled.')
    await user.click(screen.getByRole('button', { name: 'Publish roster' }))
    await user.click(screen.getByRole('button', { name: /Response queue/ }))
    await user.click(screen.getAllByRole('button', { name: 'Record reminder' })[0])
    expect(screen.getByRole('status')).toHaveTextContent('No notification was sent')
    expect(screen.getByRole('dialog', { name: 'Assignment responses' })).toHaveTextContent('1 total')
    await user.click(screen.getByRole('button', { name: 'Open team-member preview' }))
    await user.click(screen.getAllByRole('button', { name: 'Acknowledge' })[0])
    expect(screen.getByRole('status')).toHaveTextContent('receipt acknowledged')
    expect(screen.getByText('Published v1')).toBeInTheDocument()
  }, 10_000)

  it('opens the completed manager overview, coverage, and branch-only team views', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)

    expect(screen.getByRole('heading', { name: 'Manager overview' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Current branch workforce status' })).toHaveTextContent('On shift6')
    expect(screen.getByText('Central Branch scope enforced')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Coverage/ }))
    expect(screen.getByRole('heading', { name: 'Coverage and readiness' })).toBeInTheDocument()
    expect(screen.getByText(/Attendance readiness is not active for a draft/)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Team members' }))
    expect(screen.getByRole('heading', { name: 'Team members' })).toBeInTheDocument()
    expect(screen.getByText('Rank override is governance-locked')).toBeInTheDocument()
    expect(screen.queryByText(/salary|bank account|customer bill/i)).not.toBeInTheDocument()
  })

  it('records an attendance correction decision from preserved source evidence', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Weekly schedule' }))
    await user.click(screen.getByRole('button', { name: 'Review & publish' }))
    await user.type(screen.getByLabelText(/Reason for publishing below minimum/), 'Two approved gaps are being backfilled.')
    await user.click(screen.getByRole('button', { name: 'Publish roster' }))
    await user.click(screen.getByRole('link', { name: 'Attendance' }))

    expect(screen.getByRole('heading', { name: 'Attendance review' })).toBeInTheDocument()
    expect(screen.getAllByText(/Correction request/).length).toBeGreaterThan(0)
    await user.type(screen.getByLabelText('Manager decision reason'), 'Security desk evidence confirms the arrival time.')
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(screen.getByRole('status')).toHaveTextContent('Attendance decision recorded')
    await user.click(screen.getByRole('button', { name: 'All evidence' }))
    expect(screen.getByText(/approve recorded by Ariun Manager/i)).toBeInTheDocument()
  })

  it('records a reason-required availability override from the team view', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Team members' }))

    await user.selectOptions(screen.getByLabelText('Override'), 'unavailable')
    await user.type(screen.getByLabelText('Reason'), 'Approved training conflict recorded by the manager.')
    await user.click(screen.getByRole('button', { name: 'Save availability' }))

    expect(screen.getByRole('status')).toHaveTextContent('Availability override recorded')
    expect(screen.getByText(/Latest override: unavailable/)).toBeInTheDocument()
  })
})
