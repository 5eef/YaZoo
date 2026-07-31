import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { I18nProvider } from '../../contexts/I18nContext'
import OnboardingPrompt from './OnboardingPrompt'

function renderPrompt(userId = 7) {
  localStorage.setItem('yazoo-locale', 'fr')

  return render(
    <I18nProvider>
      <OnboardingPrompt userId={userId} />
    </I18nProvider>,
  )
}

describe('OnboardingPrompt', () => {
  it('peut etre passe et stocke son etat localement', async () => {
    const user = userEvent.setup()
    localStorage.removeItem('yazoo-onboarding-v1:7')

    renderPrompt()

    expect(screen.getByRole('heading', { name: 'Commencez tranquillement sur YaZoo' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Passer' }))

    expect(screen.queryByRole('heading', { name: 'Commencez tranquillement sur YaZoo' })).not.toBeInTheDocument()
    expect(localStorage.getItem('yazoo-onboarding-v1:7')).toBe('done')
  })

  it('reste masque quand il a deja ete passe', () => {
    localStorage.setItem('yazoo-onboarding-v1:8', 'done')

    renderPrompt(8)

    expect(screen.queryByRole('heading', { name: 'Commencez tranquillement sur YaZoo' })).not.toBeInTheDocument()
  })

  it('affiche une checklist specifique au veterinaire', async () => {
    const user = userEvent.setup()
    localStorage.removeItem('yazoo-onboarding-v1:9')

    renderPrompt(9)
    await user.click(screen.getByRole('button', { name: 'Veterinaire' }))

    expect(screen.getByText(/licence vétérinaire/i)).toBeInTheDocument()
    expect(screen.getByText(/créneaux sans chevauchement/i)).toBeInTheDocument()
  })
})
