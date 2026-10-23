import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'

import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import { useAuth } from '../hooks/useAuth'
import { DemoBackendContext } from '../contexts/demo-backend-context'
import { I18nContext } from '../contexts/i18n-context'
import { translate } from '../lib/i18n'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('soumet les identifiants a la couche auth', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockResolvedValue({})

    useAuth.mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: false,
      login,
    })

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <LoginPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'imane@yazoo.ma')
    await user.type(screen.getByLabelText('Mot de passe'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(login).toHaveBeenCalledWith({
      email: 'imane@yazoo.ma',
      password: 'secret123',
    })
  })

  it('affiche le message d erreur retourne par l API', async () => {
    const user = userEvent.setup()
    const login = vi.fn().mockRejectedValue({
      response: {
        data: {
          message: 'Identifiants invalides.',
        },
      },
    })

    useAuth.mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: false,
      login,
    })

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <LoginPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'imane@yazoo.ma')
    await user.type(screen.getByLabelText('Mot de passe'), 'bad-password')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByText('Identifiants invalides.')).toHaveClass(
      'dark:bg-rose-950/60',
      'dark:text-rose-100',
    )
  })
})


describe('LoginPage regression protection', () => {
  it('disables submission while a request is pending and clears an old error', async () => {
    let complete
    const login = vi.fn().mockRejectedValueOnce({ response: { data: { message: 'Invalid credentials' } } })
      .mockImplementationOnce(() => new Promise((resolve) => { complete = resolve }))
    useAuth.mockReturnValue({ isAuthenticated: false, login })
    const user = userEvent.setup()
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    await user.type(screen.getByLabelText('Email'), 'test@example.test')
    await user.type(screen.getByLabelText('Mot de passe'), 'private-test')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByText('Invalid credentials')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Connexion/ })).toBeDisabled()
    await act(async () => complete({}))
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeEnabled()
  })

  it('prevents login during server wake and enables it when ready', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, login: vi.fn() })
    const view = (status) => <MemoryRouter><DemoBackendContext.Provider value={{ status }}><LoginPage /></DemoBackendContext.Provider></MemoryRouter>
    const { rerender } = render(view('waking'))
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeDisabled()
    expect(document.getElementById('login-backend-status')).toBeVisible()
    rerender(view('ready'))
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeEnabled()
    expect(document.getElementById('login-backend-status')).toBeNull()
  })

  it.each(['fr', 'ar', 'en'])('submits the same named fields in %s', async (locale) => {
    const login = vi.fn().mockResolvedValue({})
    useAuth.mockReturnValue({ isAuthenticated: false, login })
    const user = userEvent.setup()
    const t = (key, replacements) => translate(locale, key, replacements)
    render(<MemoryRouter><I18nContext.Provider value={{ t }}><LoginPage /></I18nContext.Provider></MemoryRouter>)
    await user.type(screen.getByLabelText(t('auth.login.email')), 'locale@example.test')
    await user.type(screen.getByLabelText(t('auth.login.password')), 'test-private')
    await user.click(screen.getByRole('button', { name: t('auth.login.submit') }))
    expect(login).toHaveBeenCalledWith({ email: 'locale@example.test', password: 'test-private' })
    expect(screen.getByRole('link', { name: t('auth.login.createAccount') })).toHaveAttribute('href', expect.stringContaining('/register'))
  })

  it('navigates to the requested internal destination after authentication', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, login: vi.fn() })
    render(<MemoryRouter initialEntries={['/login?returnTo=%2Ffeed']}><Routes><Route path="/login" element={<LoginPage />} /><Route path="/feed" element={<p>Authenticated destination</p>} /></Routes></MemoryRouter>)
    expect(screen.getByText('Authenticated destination')).toBeVisible()
  })
})


it('preserves registration fields and payload', async () => {
  const register = vi.fn().mockResolvedValue({})
  useAuth.mockReturnValue({ isAuthenticated: false, register })
  const user = userEvent.setup()
  const { container } = render(<MemoryRouter><RegisterPage /></MemoryRouter>)
  const payload = { name: 'Test User', email: 'new@example.test', password: 'Private-Test-2026!', password_confirmation: 'Private-Test-2026!', phone: '+212600009999', country: 'Maroc', city: 'Agadir' }
  for (const [name, value] of Object.entries(payload)) {
    await user.type(container.querySelector(`[name="${name}"]`), value)
  }
  await user.click(container.querySelector('button[type="submit"]'))
  expect(register).toHaveBeenCalledWith(payload)
})

it('shows only the current password error after an earlier Google error', async () => {
  useAuth.mockReturnValue({ isAuthenticated: false, login: vi.fn().mockRejectedValue({ response: { data: { message: 'Current credential error' } } }) })
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/login?auth_error=google']}><LoginPage /></MemoryRouter>)
  const oldMessage = translate('fr', 'auth.login.googleFailed')
  expect(screen.getByText(oldMessage)).toBeVisible()
  await user.type(screen.getByLabelText('Email'), 'test@example.test')
  await user.type(screen.getByLabelText('Mot de passe'), 'private-test')
  await user.click(screen.getByRole('button', { name: 'Se connecter' }))
  expect(await screen.findByText('Current credential error')).toBeVisible()
  expect(screen.queryByText(oldMessage)).not.toBeInTheDocument()
})
