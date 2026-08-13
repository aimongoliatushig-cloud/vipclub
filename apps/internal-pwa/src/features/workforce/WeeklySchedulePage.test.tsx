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

    await user.click(screen.getByRole('button', { name: /CEO follow-up/ }))
    const dialog = screen.getByRole('dialog', { name: 'Branch follow-up' })
    expect(dialog).toHaveTextContent('This does not infer effort from missing activity')
    expect(dialog).toHaveTextContent('Last recorded manager action')
    await user.click(screen.getByRole('button', { name: 'Create follow-up task' }))
    await user.click(screen.getByRole('button', { name: 'Create task' }))

    expect(screen.getByRole('status')).toHaveTextContent('CEO follow-up task recorded')
    expect(dialog).toHaveTextContent('Latest: task due')
  })
})
