import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App, { ManagementRuntimeBoundary } from './App'

function BrokenManagementView(): ReactElement {
  throw new Error('Failed to fetch dynamically imported module')
}

describe('role-aware management app', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a recoverable update action when a cached management chunk cannot load', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<ManagementRuntimeBoundary><BrokenManagementView /></ManagementRuntimeBoundary>)

    expect(screen.getByRole('heading', { name: 'Шинэ хувилбарыг ачаална уу' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Шинэ хувилбар ачаалах' })).toBeEnabled()
    expect(screen.getByText(/Таны нэвтрэлт болон оруулсан мэдээлэл устахгүй/)).toBeInTheDocument()
  })

  it('routes guests to the single staff login instead of showing a second manager login', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: { authenticated: false } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Нэвтрэх хэсэг рүү шилжүүлж байна…' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ажилтны апп руу орох' })).toHaveAttribute('href', '/staff/')
    expect(screen.queryByLabelText('Нэвтрэх нэр')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Нууц үг')).not.toBeInTheDocument()
  })

  it('loads the CEO dashboard only from the live management API', async () => {
    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('get_session')) return new Response(JSON.stringify({ message: {
        authenticated: true, user: 'ceo@example.test', display_name: 'Захирал', role: 'CEO', branches: ['Nomad', 'Neva', 'Sapphire', 'Monarch'], csrf_token: 'test',
      } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      if (url.includes('get_company_dashboard')) return new Response(JSON.stringify({ message: {
        month: '2026-08', branches: [
          { branch: 'Nomad', actual_sales: 1_000_000, active_target: 0, achievement_percent: null, remaining_amount: null, goal: null, customers: 2, customer_total_spend: 1_000_000, active_team_members: 3, active_entertainers: 1, pending_leave: 0, pending_penalties: 0, monthly_penalty_records: 0, approved_penalty_amount: 0 },
          { branch: 'Neva', actual_sales: 0, active_target: 0, achievement_percent: null, remaining_amount: null, goal: null, customers: 0, customer_total_spend: 0, active_team_members: 0, active_entertainers: 0, pending_leave: 0, pending_penalties: 0, monthly_penalty_records: 0, approved_penalty_amount: 0 },
          { branch: 'Sapphire', actual_sales: 0, active_target: 0, achievement_percent: null, remaining_amount: null, goal: null, customers: 0, customer_total_spend: 0, active_team_members: 0, active_entertainers: 0, pending_leave: 0, pending_penalties: 0, monthly_penalty_records: 0, approved_penalty_amount: 0 },
          { branch: 'Monarch', actual_sales: 0, active_target: 0, achievement_percent: null, remaining_amount: null, goal: null, customers: 0, customer_total_spend: 0, active_team_members: 0, active_entertainers: 0, pending_leave: 0, pending_penalties: 0, monthly_penalty_records: 0, approved_penalty_amount: 0 },
        ], pending_goals: [], totals: { actual_sales: 1_000_000, active_target: 0, customers: 2, active_team_members: 3, active_entertainers: 1, unassigned_active_employees: 0, pending_leave: 0, pending_penalties: 0, pending_goals: 0 }, generated_at: '2026-08-16 08:20:00',
      } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ message: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })

    render(<App />)
    expect(
      await screen.findByRole('heading', { name: 'Удирдлагын төв' }, { timeout: 10_000 }),
    ).toBeInTheDocument()
    expect(screen.getByText('1 сая ₮')).toBeInTheDocument()
    expect(screen.getByText('Сарын зорилго батлагдаагүй')).toBeInTheDocument()
    expect(screen.queryByText('Компанийн эрүүл мэнд')).not.toBeInTheDocument()
    expect(screen.queryByText('DEMO DATA')).not.toBeInTheDocument()
  })
})
