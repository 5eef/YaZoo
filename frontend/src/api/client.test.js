import axios from 'axios'
import { describe, expect, it, vi } from 'vitest'

import api, { ensureCsrfCookie } from './client'
import { invalidateSessionRequests } from './sessionEpoch'

describe('api client', () => {
  it('rejects a late successful response from the previous account', async () => {
    let finish
    const result = api.get('/users/1', { adapter: config => new Promise(resolve => {
      finish = () => resolve({ config, status: 200, data: { private: true } })
    }) }).catch(error => error)
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
    invalidateSessionRequests()
    finish()
    expect(axios.isCancel(await result)).toBe(true)
  })
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
