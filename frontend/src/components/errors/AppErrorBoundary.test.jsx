import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../contexts/I18nContext'
import AppErrorBoundary from './AppErrorBoundary'

function BrokenChild() {
  throw new Error('render failed')
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    localStorage.setItem('yazoo-locale', 'fr')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('remplace un arbre en erreur par un fallback accessible', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<I18nProvider><AppErrorBoundary><BrokenChild /></AppErrorBoundary></I18nProvider>)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /erreur/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recharger' })).toBeInTheDocument()
  })

  it('localise le fallback global en arabe', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem('yazoo-locale', 'ar')

    render(<I18nProvider><AppErrorBoundary><BrokenChild /></AppErrorBoundary></I18nProvider>)

    expect(screen.getByRole('heading', { name: 'حدث خطأ غير متوقع' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إعادة التحميل' })).toBeInTheDocument()
  })
})
