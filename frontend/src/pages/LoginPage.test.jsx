import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'

import LoginPage from './LoginPage'
import { useAuth } from '../hooks/useAuth'

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
