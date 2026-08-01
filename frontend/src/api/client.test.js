import { describe, expect, it } from 'vitest'

import api from './client'

describe('api client', () => {
  it('envoie le jeton XSRF pour les mutations entre les ports locaux', () => {
    expect(api.defaults.withCredentials).toBe(true)
    expect(api.defaults.withXSRFToken).toBe(true)
  })
})
