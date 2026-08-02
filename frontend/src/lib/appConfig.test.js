import { afterEach, describe, expect, it, vi } from 'vitest'

describe('appConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('normalise les slashs finaux de VITE_API_URL sans ajouter deux fois /api', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.yazoo.test///')

    const { getApiBaseUrl, getBackendBaseUrl } = await import('./appConfig')

    expect(getApiBaseUrl()).toBe('https://api.yazoo.test/api')
    expect(getBackendBaseUrl()).toBe('https://api.yazoo.test')
  })

  it('conserve une URL deja suffixee par /api', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.yazoo.test/api///')

    const { getApiBaseUrl } = await import('./appConfig')

    expect(getApiBaseUrl()).toBe('https://api.yazoo.test/api')
  })

  it('accepte le chemin same-origin utilise par le proxy CSRF', async () => {
    vi.stubEnv('VITE_API_URL', '/api')

    const { getApiBaseUrl, getBackendBaseUrl } = await import('./appConfig')

    expect(getApiBaseUrl()).toBe('/api')
    expect(getBackendBaseUrl()).toBe('')
  })
})
