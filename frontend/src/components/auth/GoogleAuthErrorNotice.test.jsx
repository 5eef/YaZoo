import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { getGoogleAuthErrorMessage } from '../../lib/googleAuthErrors'
import GoogleAuthErrorNotice from './GoogleAuthErrorNotice'

describe('GoogleAuthErrorNotice', () => {
  it.each([
    ['google_not_configured', 'login', 'auth.login.googleNotConfigured'],
    ['google', 'login', 'auth.login.googleFailed'],
    ['google_not_configured', 'register', 'auth.register.googleNotConfigured'],
    ['google', 'register', 'auth.register.googleFailed'],
  ])('traduit %s pour le parcours %s', (authError, flow, translationKey) => {
    const translate = vi.fn((key) => `translated:${key}`)

    expect(getGoogleAuthErrorMessage(authError, flow, translate)).toBe(
      `translated:${translationKey}`,
    )
    expect(translate).toHaveBeenCalledWith(translationKey)
  })

  it('ignore une erreur ou un parcours inconnu sans appeler la traduction', () => {
    const translate = vi.fn()

    expect(getGoogleAuthErrorMessage('unexpected', 'login', translate)).toBe('')
    expect(getGoogleAuthErrorMessage('google', 'unexpected', translate)).toBe('')
    expect(translate).not.toHaveBeenCalled()
  })

  it('conserve le rendu visuel de l alerte seulement lorsqu un message existe', () => {
    const { container, rerender } = render(<GoogleAuthErrorNotice message="" />)

    expect(container).toBeEmptyDOMElement()

    rerender(<GoogleAuthErrorNotice message="Google indisponible" />)

    expect(screen.getByText('Google indisponible')).toHaveClass(
      'rounded-2xl',
      'border-amber-200',
      'dark:bg-amber-950/60',
    )
  })
})
