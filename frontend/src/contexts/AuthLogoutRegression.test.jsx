import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'
import { useAuth } from '../hooks/useAuth'
import { loginRequest, logoutRequest, meRequest } from '../api/auth'
import { emitErrorToast } from '../lib/toastBus'

vi.mock('../hooks/useDemoBackendStatus', () => ({ useDemoBackendStatus: () => ({ status: 'ready' }) }))
vi.mock('../api/auth', () => ({ loginRequest: vi.fn(), logoutRequest: vi.fn(), meRequest: vi.fn(), registerRequest: vi.fn() }))
vi.mock('../api/client', () => ({ AUTH_SESSION_EXPIRED_EVENT: 'yazoo:auth-session-expired', ensureCsrfCookie: vi.fn().mockResolvedValue({}) }))
vi.mock('../lib/toastBus', () => ({ emitErrorToast: vi.fn() }))
let auth
const expired = { response: { status: 401 } }
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
function Probe() { auth = useAuth(); return <span>{auth.user?.name ?? 'Public'}</span> }
async function start() {
  meRequest.mockResolvedValueOnce({ data: { user: { id: 1, name: 'Client A' } } })
  render(<AuthProvider><Probe /></AuthProvider>)
  await screen.findByText('Client A')
}
beforeEach(() => { vi.resetAllMocks(); localStorage.clear() })
describe('private session boundaries', () => {
  it('cannot restore an old bootstrap after logout', async () => {
    const bootstrap = deferred()
    meRequest.mockReturnValueOnce(bootstrap.promise)
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(meRequest).toHaveBeenCalledTimes(1))
    logoutRequest.mockResolvedValueOnce({})
    meRequest.mockRejectedValueOnce(expired)
    await act(async () => {
      await auth.logout()
      bootstrap.resolve({ data: { user: { id: 1, name: 'Obsolete bootstrap' } } })
    })
    expect(screen.getByText('Public')).toBeInTheDocument()
  })
  it('rejects a stale page rollback through setUser after logout', async () => {
    await start()
    const oldSetter = auth.setUser
    logoutRequest.mockResolvedValueOnce({})
    meRequest.mockRejectedValueOnce(expired)
    await act(async () => { await auth.logout(); oldSetter({ id: 1, name: 'Stale private profile' }) })
    expect(screen.getByText('Public')).toBeInTheDocument()
  })
  it('hides data before a slow logout completes and verifies 401 without replay', async () => {
    await start()
    const pending = deferred()
    logoutRequest.mockReturnValueOnce(pending.promise)
    meRequest.mockRejectedValueOnce(expired)
    let result
    act(() => { result = auth.logout() })
    expect(screen.getByText('Public')).toBeInTheDocument()
    await act(async () => { pending.resolve({}); expect(await result).toEqual({ remoteRevoked: true }) })
    expect(logoutRequest).toHaveBeenCalledTimes(1)
  })
  it.each([undefined, 419, 429, 503])('locks reload and reports unverified logout on HTTP %s', async status => {
    await start()
    logoutRequest.mockRejectedValueOnce({ response: { status } })
    await act(async () => { expect(await auth.logout()).toEqual({ remoteRevoked: false }) })
    expect(screen.getByText('Public')).toBeInTheDocument()
    expect(localStorage.getItem('yazoo:session-barrier')).toMatch(/^blocked:/)
    expect(emitErrorToast).toHaveBeenCalled()
    expect(logoutRequest).toHaveBeenCalledTimes(1)
  })
  it('does not claim revocation if me still returns the old account', async () => {
    await start()
    logoutRequest.mockResolvedValueOnce({})
    meRequest.mockResolvedValueOnce({ data: { user: { id: 1 } } })
    await act(async () => { expect(await auth.logout()).toEqual({ remoteRevoked: false }) })
    expect(screen.getByText('Public')).toBeInTheDocument()
  })
  it('does not restore a blocked cookie on a new mount', async () => {
    localStorage.setItem('yazoo:session-barrier', 'blocked:1')
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(auth.isBootstrapping).toBe(false))
    expect(meRequest).not.toHaveBeenCalled()
  })
  it('clears the account on cross-tab events and session expiration', async () => {
    await start()
    act(() => globalThis.dispatchEvent(new StorageEvent('storage', { key: 'yazoo:session-barrier', newValue: 'blocked:2' })))
    expect(screen.getByText('Public')).toBeInTheDocument()
    act(() => globalThis.dispatchEvent(new CustomEvent('yazoo:auth-session-expired')))
    expect(auth.isAuthenticated).toBe(false)
  })
  it('cannot apply a pending login after logout and revokes its eventual cookie', async () => {
    await start()
    const pending = deferred()
    loginRequest.mockReturnValueOnce(pending.promise)
    let loginResult, logoutResult
    act(() => { loginResult = auth.login({}).catch(error => error); logoutResult = auth.logout() })
    logoutRequest.mockResolvedValueOnce({})
    meRequest.mockRejectedValueOnce(expired)
    await act(async () => {
      pending.resolve({ data: { user: { id: 2, name: 'Veterinarian B' } } })
      expect(await loginResult).toBeInstanceOf(Error)
      expect(await logoutResult).toEqual({ remoteRevoked: true })
    })
    expect(screen.getByText('Public')).toBeInTheDocument()
  })
})
