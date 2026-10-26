import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach } from 'vitest'

import LanguageSwitcher from '../components/ui/LanguageSwitcher'
import { I18nProvider } from './I18nContext'
import { LOCALE_STORAGE_KEY, getDirection, translate } from '../lib/i18n'

function Probe() {
  return <LanguageSwitcher />
}

describe('i18n', () => {
  it('restores the explicit URL language on history navigation', () => {
    render(<I18nProvider><Probe /></I18nProvider>)
    act(() => {
      history.pushState({}, '', '/ar')
      dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(document.documentElement).toHaveAttribute('lang', 'ar')
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    act(() => {
      history.replaceState({}, '', '/')
      dispatchEvent(new PopStateEvent('popstate'))
    })
  })
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(LOCALE_STORAGE_KEY, 'fr')
    document.documentElement.lang = ''
    document.documentElement.dir = ''
    document.documentElement.className = ''
  })

  it('applies rtl for Arabic and persists the selected locale', async () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Arabe' }))

    expect(document.documentElement).toHaveAttribute('lang', 'ar')
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    expect(document.documentElement).toHaveClass('rtl')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ar')
  })

  it('keeps ltr for French', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'ar')

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'الفرنسية' }))

    expect(document.documentElement).toHaveAttribute('lang', 'fr')
    expect(document.documentElement).toHaveAttribute('dir', 'ltr')
    expect(document.documentElement).not.toHaveClass('rtl')
  })

  it('contains critical French and Arabic service/contact keys', () => {
    expect(getDirection('ar')).toBe('rtl')
    expect(getDirection('fr')).toBe('ltr')
    expect(translate('fr', 'contact.openWhatsapp')).toBe('Ouvrir WhatsApp')
    expect(translate('ar', 'contact.openWhatsapp')).toBe('فتح WhatsApp')
    expect(translate('fr', 'services.training')).toBe("Dresseur/Dresseuse d'animaux")
    expect(translate('ar', 'reservations.bookSession')).toBe('حجز حصة تدريب')
  })

  it('contains complete settings and marketplace labels in supported locales', () => {
    expect(translate('fr', 'settings.title')).toBe('Gérer mon expérience YaZoo')
    expect(translate('ar', 'settings.title')).toBe('إدارة تجربتي في YaZoo')
    expect(translate('en', 'settings.title')).toBe('Manage my YaZoo experience')
    expect(translate('fr', 'common.marketplace')).toBe('Marché YaZoo')
    expect(translate('ar', 'common.marketplace')).toBe('سوق YaZoo')
    expect(translate('en', 'common.marketplace')).toBe('YaZoo Market')
  })
})
