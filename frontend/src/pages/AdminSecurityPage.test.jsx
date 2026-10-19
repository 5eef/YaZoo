import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { I18nProvider } from '../contexts/I18nContext'
import * as api from '../api/admin'
import AdminSecurityPage from './AdminSecurityPage'

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 1, isAdmin: true } }) }))
vi.mock('../api/admin', () => ({ getAdminMfaStatusRequest: vi.fn(), enrollAdminMfaRequest: vi.fn(), confirmAdminMfaRequest: vi.fn(), challengeAdminMfaRequest: vi.fn(), disableAdminMfaRequest: vi.fn(), regenerateAdminMfaRecoveryCodesRequest: vi.fn() }))
const mount = () => render(<MemoryRouter><I18nProvider><AdminSecurityPage /></I18nProvider></MemoryRouter>)
beforeEach(() => { vi.resetAllMocks(); localStorage.setItem('yazoo-locale', 'fr') })
afterEach(cleanup)

it('reports a failed status request without falsely claiming MFA is disabled', async () => {
  api.getAdminMfaStatusRequest.mockRejectedValue({ response: { status: 503, data: { message: 'MFA status unavailable' } } })
  mount()
  await screen.findByText('MFA status unavailable')
  await userEvent.type(screen.getByLabelText('Mot de passe actuel'), 'Isolated password')
  expect(screen.getByRole('button', { name: 'Commencer l’enrôlement' })).toBeDisabled()
  expect(api.enrollAdminMfaRequest).not.toHaveBeenCalled()
  api.getAdminMfaStatusRequest.mockResolvedValue({ data: { enabled: false } })
  await userEvent.click(screen.getByRole('button', { name: 'Actualiser' }))
  await screen.findByText('MFA non activée (déploiement progressif).')
  expect(screen.getByRole('button', { name: 'Commencer l’enrôlement' })).toBeEnabled()
})

it('submits a challenge once and clears the one time code on success', async () => {
  api.getAdminMfaStatusRequest.mockResolvedValue({ data: { enabled: true } })
  api.challengeAdminMfaRequest.mockResolvedValue({ data: { verified: true } })
  mount()
  const code = await screen.findByLabelText(/Code/)
  await userEvent.type(code, '123456')
  await userEvent.click(await screen.findByRole('button', { name: /Vérifier/ }))
  expect(api.challengeAdminMfaRequest).toHaveBeenCalledExactlyOnceWith('123456')
  expect(code).toHaveValue('')
})
