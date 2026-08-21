import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callFrappe } from './frappeClient'
import { FrappeLoginRequiredError, FrappeManagementApi } from './managementApi'

describe('same-origin Frappe client', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('uses the current origin and includes the Frappe session cookie', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: { ok: true } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    await callFrappe('nomad_vip.api.management.get_session')
    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/api/method/nomad_vip.api.management.get_session')
    expect(options).toMatchObject({ credentials: 'include', cache: 'no-store' })
  })

  it('maps a server-derived manager session without accepting a client role', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: {
      user: 'manager.nomad@vipclub.local', display_name: 'Nomad Manager', role: 'Branch Manager',
      branch: 'Nomad', branches: ['Nomad'], capabilities: {},
    } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const session = await new FrappeManagementApi().getSession()
    expect(session).toMatchObject({ role: 'branch-manager', branchIds: ['Nomad'], source: 'server' })
    expect(session.permissions).toContain('branch.crm.read')
    expect(session.permissions).not.toContain('company.approvals.write')
  })

  it('logs in through the same app session before loading the server role', async () => {
    const fetchMock = vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Logged In' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: {
        user: 'manager.nomad@vipclub.local', display_name: 'Nomad Manager', role: 'Branch Manager',
        branch: 'Nomad', branches: ['Nomad'], capabilities: {}, csrf_token: 'csrf-login',
      } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const session = await new FrappeManagementApi().login('manager.nomad@vipclub.local', 'secret')
    expect(session).toMatchObject({ role: 'branch-manager', branchIds: ['Nomad'] })
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/method/login')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' })
  })

  it('maps the guest session response to a dedicated login redirect signal', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: {
      authenticated: false,
    } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    await expect(new FrappeManagementApi().getSession()).rejects.toBeInstanceOf(FrappeLoginRequiredError)
  })

  it('stores the server-issued CSRF token for protected writes', async () => {
    const fetchMock = vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: {
        user: 'manager.nomad@vipclub.local', display_name: 'Nomad Manager', role: 'Branch Manager',
        branch: 'Nomad', branches: ['Nomad'], capabilities: {}, csrf_token: 'csrf-from-server',
      } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const api = new FrappeManagementApi()
    await api.getSession()
    await api.decideLeave('L-1', 'Approved', '')
    const [, options] = fetchMock.mock.calls[1]
    expect(options?.headers).toMatchObject({ 'X-Frappe-CSRF-Token': 'csrf-from-server' })
  })
})
