import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ScrollTopButton from './ScrollTopButton'
import { I18nProvider } from '../../contexts/I18nContext'

describe('ScrollTopButton', () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    scrollIntoView.mockClear()
    localStorage.setItem('yazoo-locale', 'fr')
    Object.defineProperty(globalThis, 'scrollY', {
      configurable: true,
      value: 0,
      writable: true,
    })
    globalThis.matchMedia = vi.fn().mockReturnValue({ matches: false })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function renderButton() {
    return render(
      <I18nProvider>
        <main id="main-content" ref={(node) => {
          if (node) node.scrollIntoView = scrollIntoView
        }}>
          Contenu
        </main>
        <ScrollTopButton />
      </I18nProvider>,
    )
  }

  it('reste masque au debut puis apparait apres le seuil de scroll', async () => {
    renderButton()
    const button = screen.getByRole('button', { name: /haut/i })

    expect(button).toHaveClass('pointer-events-none', 'opacity-0', 'xl:left-[6.5rem]')
    expect(button).toHaveClass('dark:bg-[linear-gradient(135deg,rgba(124,58,237,0.98),rgba(76,29,149,0.98))]', 'dark:text-white')
    expect(button).not.toHaveTextContent(/haut/i)

    globalThis.scrollY = 240
    fireEvent.scroll(globalThis)

    await waitFor(() => {
      expect(button).toHaveClass('pointer-events-auto', 'opacity-100')
    })
  })

  it('remonte le contenu sans animation si les mouvements sont reduits', async () => {
    const user = userEvent.setup()
    globalThis.matchMedia = vi.fn().mockReturnValue({ matches: true })
    renderButton()

    globalThis.scrollY = 240
    fireEvent.scroll(globalThis)
    await user.click(screen.getByRole('button', { name: /haut/i }))

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    })
  })
})
