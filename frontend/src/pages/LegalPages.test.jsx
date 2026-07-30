import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import api from '../api/client'
import { I18nProvider } from '../contexts/I18nContext'
import { LOCALE_STORAGE_KEY } from '../lib/i18n'
import { resetLegalConfigCacheForTests } from '../hooks/useLegalConfig'
import AboutPage from './AboutPage'
import PrivacyPage from './PrivacyPage'
import PublishingRulesPage from './PublishingRulesPage'
import TermsPage from './TermsPage'

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

const legalConfig = {
  entityName: 'YaZoo Test',
  dataControllerName: 'Responsable Test',
  privacyContactEmail: 'privacy@example.test',
  legalStatus: 'Projet pilote',
  address: 'Adresse Test',
  ice: 'ICE-TEST',
  dataRetentionDays: 365,
  dataRequestResponseDays: 30,
}

function renderPage(Component, locale = 'fr') {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)

  return render(
    <MemoryRouter>
      <I18nProvider>
        <Component />
      </I18nProvider>
    </MemoryRouter>,
  )
}

describe('legal public pages', () => {
  beforeEach(() => {
    resetLegalConfigCacheForTests()
    api.get.mockResolvedValue({ data: legalConfig })
  })

  it.each([
    ['fr', 'Informations officielles configurées', 'ltr'],
    ['ar', 'المعلومات الرسمية المهيأة', 'rtl'],
    ['en', 'Configured official information', 'ltr'],
  ])('renders configured values without placeholders in %s', async (locale, title, direction) => {
    const { container } = renderPage(AboutPage, locale)

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getAllByText('YaZoo Test').length).toBeGreaterThan(0)
    expect(screen.getAllByText('privacy@example.test').length).toBeGreaterThan(0)
    expect(document.documentElement).toHaveAttribute('dir', direction)
    expect(container.textContent).not.toMatch(/A compl[ée]ter|To be completed|يستكمل/iu)
  })

  it.each([PrivacyPage, TermsPage, PublishingRulesPage])(
    'uses the shared runtime legal configuration on every legal route',
    async (Component) => {
      renderPage(Component)

      await waitFor(() => {
        expect(screen.getByText('Responsable Test')).toBeInTheDocument()
      })
    },
  )
})
