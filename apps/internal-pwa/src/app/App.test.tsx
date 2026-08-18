import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetManagerBusinessPrototype } from '../features/workforce/managerBusinessService'
import { resetManagerOperationsPrototype } from '../features/workforce/managerOperationsService'
import { resetWorkforcePrototype } from '../features/workforce/workforceService'
import App from './App'
import { resetManagementSessionPrototype } from './sessionStore'

describe('role-aware management app', () => {
  beforeEach(() => {
    resetManagementSessionPrototype()
    resetManagerBusinessPrototype()
    resetManagerOperationsPrototype()
    resetWorkforcePrototype()
  })

  it('shows a Mongolian role entry and renders different Manager and CEO workspaces', async () => {
    const user = userEvent.setup()
    render(<App initialSession={null} />)

    expect(screen.getByRole('heading', { name: 'Турших ажлын орчноо сонгоно уу' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Салбарын менежер/ }))
    expect(await screen.findByRole('navigation', { name: 'Менежерийн навигац' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Менежерийн тойм' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Гүйцэтгэх захирлын навигац' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Системээс гарах' }))
    await user.click(screen.getByRole('button', { name: /Гүйцэтгэх захирал/ }))
    expect(await screen.findByRole('navigation', { name: 'Үндсэн цэс' }, { timeout: 5000 })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Удирдлагын төв' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Менежерийн навигац' })).not.toBeInTheDocument()
  })

  it('keeps the full CEO decision workspace available after role entry', async () => {
    const user = userEvent.setup()
    render(<App initialSession={null} />)

    await user.click(screen.getByRole('button', { name: /Гүйцэтгэх захирал/ }))
    const navigation = await screen.findByRole('navigation', { name: 'Үндсэн цэс' })
    expect(navigation).toHaveTextContent('Борлуулалт ба зорилт')
    expect(navigation).toHaveTextContent('Санхүү ба тооцоо')
    expect(navigation).toHaveTextContent('Даалгавар')
    expect(navigation).toHaveTextContent('Hermes')
    expect(navigation).toHaveTextContent('Тайлан, шинжилгээ')
    expect(await screen.findByRole('heading', { name: 'Менежерүүдээс ирсэн шинэ мэдээлэл' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Шийдвэрүүд/ }))
    expect(await screen.findByRole('heading', { name: 'Шийдвэрүүд' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Менежерээс ирсэн хүсэлт' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Шийдвэрийн queue' })).toBeInTheDocument()

    const customerRecommendation = screen.getByRole('heading', { name: 'Эрдэнэ Т.' }).closest('article')
    expect(customerRecommendation).not.toBeNull()
    await user.type(within(customerRecommendation as HTMLElement).getByLabelText(/Шийдвэрийн тайлбар/), 'Нотолгоо бүрэн тул батлав.')
    await user.click(within(customerRecommendation as HTMLElement).getByRole('button', { name: 'Санал батлах' }))
    expect(within(customerRecommendation as HTMLElement).getByText('Баталсан')).toBeInTheDocument()
  })
})
