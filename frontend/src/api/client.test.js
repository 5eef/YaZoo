import axios from 'axios'
import { describe, expect, it, vi } from 'vitest'

import api, { ensureCsrfCookie } from './client'

describe('api client', () => {
  it('envoie le jeton XSRF pour les mutations entre les ports locaux', () => {
    expect(api.defaults.withCredentials).toBe(true)
    expect(api.defaults.withXSRFToken).toBe(true)
    expect(api.defaults.timeout).toBe(30000)
  })

  it('borne la recuperation du cookie CSRF sans retry automatique', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValueOnce({})

    await ensureCsrfCookie()

    expect(get).toHaveBeenCalledWith(
      expect.stringContaining('/sanctum/csrf-cookie'),
      expect.objectContaining({ timeout: 10000 }),
    )
    get.mockRestore()
  })
})
