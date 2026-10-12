import { describe, expect, it } from 'vitest'
import { classifyApiError } from './classifyError'

describe('API error categories', () => {
  it('preserves HTTP meaning before considering a transport failure', () => {
    for (const [status, category] of [[401,'sessionExpired'],[403,'forbidden'],[404,'notFound'],[409,'conflict'],[419,'sessionExpired'],[422,'validation'],[429,'tooManyRequests'],[500,'serverTemporary']]) {
      expect(classifyApiError({ code: 'ERR_NETWORK', response: { status } })).toBe(category)
    }
    expect(classifyApiError({ response: { status: 503, data: { code: 'DEMO_BACKEND_WAKING' } } })).toBe('backendWaking')
    expect(classifyApiError({ code: 'ECONNABORTED' })).toBe('timeout')
    expect(classifyApiError({ code: 'ERR_NETWORK' })).toBe('network')
    expect(classifyApiError(new TypeError('local programming failure'))).toBe('generic')
  })
})
