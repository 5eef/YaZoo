import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../contexts/I18nContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import LandingPage from './LandingPage'

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}))

vi.mock('../components/marketplace/PublicMarketplaceShowcase', () => ({
  default: () => <section aria-label="Public marketplace preview" />,
}))

vi.mock('../components/ui/Footer', () => ({
  default: () => <footer />,
}))

describe('Startup landing page', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = ''
    document.documentElement.dir = ''
    document.documentElement.className = ''
    document.body.dir = ''
  })

  it.each([
    ['fr', 'Votre animal.', 'Les bons professionnels.', 'Trouver un vétérinaire'],
    ['en', 'Your pet.', 'The right professionals.', 'Find a veterinarian'],
    ['ar', 'حيوانك الأليف.', 'المهنيون المناسبون.', 'اعثر على طبيب بيطري'],
  ])('renders the main proposition in %s', async (locale, firstLine, secondLine, ctaLabel) => {
    localStorage.setItem('yazoo-locale', locale)

    renderLanding()

    const hero = screen.getByRole('heading', { level: 1 })
    await waitFor(() => expect(document.documentElement.lang).toBe(locale))
    expect(hero).toHaveTextContent(firstLine)
    expect(hero).toHaveTextContent(secondLine)
    expect(screen.getByRole('link', { name: ctaLabel })).toHaveAttribute(
      'href',
      '/discover/veterinarians',
    )

    if (locale === 'ar') {
      expect(document.documentElement).toHaveAttribute('dir', 'rtl')
      expect(document.body).toHaveAttribute('dir', 'rtl')
    } else {
      expect(document.documentElement).toHaveAttribute('dir', 'ltr')
    }
  })

  it('routes both hero actions to existing professional journeys', () => {
    localStorage.setItem('yazoo-locale', 'fr')

    renderLanding()

    expect(screen.getByRole('link', { name: 'Trouver un vétérinaire' })).toHaveAttribute(
      'href',
      '/discover/veterinarians',
    )
    expect(screen.getByRole('link', { name: 'Je suis professionnel' })).toHaveAttribute(
      'href',
      '/pros',
    )
    expect(screen.getByRole('link', { name: 'Voir les services' })).toHaveAttribute(
      'href',
      '/discover/services',
    )
    expect(screen.getByRole('link', { name: 'Explorer les communautés' })).toHaveAttribute(
      'href',
      '/communities',
    )
    expect(screen.getByRole('link', { name: 'Ouvrir le fil d’actualité' })).toHaveAttribute(
      'href',
      '/feed',
    )

    for (const anchor of document.querySelectorAll('a[href^="#"]')) {
      expect(document.querySelector(anchor.getAttribute('href'))).not.toBeNull()
    }
  })

  it('shows the five implemented stages and the professional benefits', () => {
    localStorage.setItem('yazoo-locale', 'fr')

    renderLanding()

    expect(screen.getByRole('heading', { name: 'Trouvez un professionnel' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Consultez son profil' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Réservez ou contactez' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Échangez directement' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Donnez votre avis' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Une vérification YaZoo' })).toBeInTheDocument()
    expect(screen.getByText(/ne constitue pas une certification ou un agrément public/)).toBeInTheDocument()
  })

  it('switches locale from the landing page and closes the mobile menu with Escape', async () => {
    const user = userEvent.setup()
    localStorage.setItem('yazoo-locale', 'fr')

    renderLanding()

    const englishButtons = screen.getAllByRole('button', { name: 'Anglais' })
    await user.click(englishButtons[0])
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Your pet. The right professionals.',
    )
    await waitFor(() => expect(document.documentElement).toHaveAttribute('lang', 'en'))

    const menuButton = screen.getByRole('button', { expanded: false })
    await user.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  })

  it.each([
    ['light', false],
    ['dark', true],
  ])('retains %s mode styling', async (theme, isDark) => {
    localStorage.setItem('yazoo-locale', 'fr')
    localStorage.setItem('yazoo-theme', theme)

    renderLanding()

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe(theme)
      expect(document.documentElement.classList.contains('dark')).toBe(isDark)
    })
    expect(screen.getByRole('main').className).toContain('dark:bg-[radial-gradient')
    expect(screen.getByRole('main').className).toContain('bg-[radial-gradient')
  })

  it('keeps the hero action full width on small screens and uses a compact menu', async () => {
    localStorage.setItem('yazoo-locale', 'fr')

    renderLanding()

    expect(screen.getByRole('link', { name: 'Trouver un vétérinaire' })).toHaveClass(
      'w-full',
      'sm:w-auto',
    )
    const menu = document.getElementById('landing-mobile-menu')
    expect(menu).toHaveClass('lg:hidden')
    expect(within(menu).getByRole('navigation')).toBeInTheDocument()
  })
})

function renderLanding() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <ThemeProvider>
          <LandingPage />
        </ThemeProvider>
      </I18nProvider>
    </MemoryRouter>,
  )
}
