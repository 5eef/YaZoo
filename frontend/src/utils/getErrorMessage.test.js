import { beforeEach, describe, expect, it } from 'vitest'
import { getErrorMessage } from './getErrorMessage'

describe('form error messages', () => {
  beforeEach(() => localStorage.setItem('yazoo-locale', 'fr'))
  it('distinguishes a slow server and demo upload policy from offline without exposing upstream diagnostics', () => {
    expect(getErrorMessage({ code: 'ECONNABORTED' })).toContain('serveur met trop de temps')
    expect(getErrorMessage({ response: { status: 409, data: { error: 'showcase.uploads_disabled', message: 'upstream details' } } })).toContain('uploads sont désactivés')
    expect(getErrorMessage({ response: { status: 503, data: { code: 'DEMO_BACKEND_WAKING' } } })).toContain('démonstration démarre')
  })
  it('retains Laravel field validation and the caller fallback for unknown exceptions', () => {
    expect(getErrorMessage({ response: { status: 422, data: { errors: { name: ['Nom requis.'] } } } })).toBe('Nom requis.')
    expect(getErrorMessage(new TypeError('local failure'), 'Réessayez.')).toBe('Réessayez.')
  })
})
