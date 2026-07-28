import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import { I18nProvider } from '../contexts/I18nContext'
import TrustSafetyPage from './TrustSafetyPage'

describe('TrustSafetyPage', () => {
  it('affiche les messages de confiance et securite', () => {
    localStorage.setItem('yazoo-locale', 'fr')

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <I18nProvider>
          <TrustSafetyPage />
        </I18nProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /Des echanges plus clairs/i })).toBeInTheDocument()
    expect(screen.getByText(/CMI est en preparation/i)).toBeInTheDocument()
  })
})
