import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./appConfig', () => ({
  getMonitoringEndpoint: () => 'https://api.test/monitoring/frontend-error',
  isMonitoringEnabled: () => true,
}))

import { reportFrontendError } from './monitoring'

describe('frontend monitoring', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('abandonne un envoi bloque apres cinq secondes sans le rejouer', async () => {
    const fetchMock = vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    vi.stubGlobal('fetch', fetchMock)

    const report = reportFrontendError(new Error('Timeout test'), {}, 'test')
    await vi.advanceTimersByTimeAsync(5000)

    await expect(report).resolves.toBe(false)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
  })
})
