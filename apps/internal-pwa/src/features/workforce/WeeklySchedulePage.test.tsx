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
})
