import { StrictMode } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import DemoServerStatus from '../components/ui/DemoServerStatus'
import { I18nContext } from './i18n-context'
import { DemoBackendContext } from './demo-backend-context'
import {
  DemoBackendProvider,
} from './DemoBackendContext'
import { pollDemoBackend } from '../lib/demoBackendPolling'

const readyResponse = () => jsonResponse({ status: 'ready' })
const wakingResponse = () => jsonResponse({ status: 'waking' }, false)
const unavailableResponse = () => jsonResponse({ status: 'unavailable' }, false)

describe('demo backend wake flow', () => {
  it('devient ready au premier probe', async () => {
    const statuses = []
    const fetchImpl = vi.fn().mockResolvedValue(readyResponse())

    const result = await pollDemoBackend({
      fetchImpl,
      onStatus: (status) => statuses.push(status),
      retryDelaysMs: [0],
      signal: new AbortController().signal,
    })

    expect(result).toBe('ready')
    expect(statuses).toEqual(['checking', 'ready'])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('passe de waking a ready avec un polling borne et sequentiel', async () => {
    const statuses = []
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(wakingResponse())
      .mockResolvedValueOnce(wakingResponse())
      .mockResolvedValueOnce(readyResponse())

    const result = await pollDemoBackend({
      fetchImpl,
      onStatus: (status) => statuses.push(status),
      retryDelaysMs: [0, 0, 0],
      signal: new AbortController().signal,
    })

    expect(result).toBe('ready')
    expect(statuses).toEqual(['checking', 'waking', 'waking', 'ready'])
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('termine unavailable apres epuisement des tentatives', async () => {
    const statuses = []
    const fetchImpl = vi.fn().mockResolvedValue(wakingResponse())

    const result = await pollDemoBackend({
      fetchImpl,
      onStatus: (status) => statuses.push(status),
      retryDelaysMs: [0, 0],
      signal: new AbortController().signal,
    })

    expect(result).toBe('unavailable')
    expect(statuses.at(-1)).toBe('unavailable')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('arrete immediatement sur un statut explicitement unavailable', async () => {
    const statuses = []
    const fetchImpl = vi.fn().mockResolvedValue(unavailableResponse())

    await pollDemoBackend({
      fetchImpl,
      onStatus: (status) => statuses.push(status),
      retryDelaysMs: [0, 0, 0],
      signal: new AbortController().signal,
    })

    expect(statuses).toEqual(['checking', 'unavailable'])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('le bouton de retry relance le provider sans voler le focus', async () => {
    const user = userEvent.setup()
    const retry = vi.fn()

    render(
      <I18nContext.Provider value={{ locale: 'en' }}>
        <DemoBackendContext.Provider value={{ retry, status: 'unavailable' }}>
          <DemoServerStatus />
        </DemoBackendContext.Provider>
      </I18nContext.Provider>,
    )

    const button = screen.getByRole('button', { name: 'Retry' })
    await user.click(button)

    expect(retry).toHaveBeenCalledTimes(1)
    expect(button).toHaveFocus()
  })

  it('annule le probe programme lors du unmount', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn().mockResolvedValue(readyResponse())
    vi.stubGlobal('fetch', fetchImpl)

    const { unmount } = render(
      <DemoBackendProvider>
        <span>content</span>
      </DemoBackendProvider>,
    )

    unmount()
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('ne lance pas deux pollings concurrents sous StrictMode', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetchImpl)

    render(
      <StrictMode>
        <DemoBackendProvider>
          <span>content</span>
        </DemoBackendProvider>
      </StrictMode>,
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

function jsonResponse(payload, ok = true) {
  return {
    ok,
    headers: {
      get: () => 'application/json; charset=utf-8',
    },
    json: vi.fn().mockResolvedValue(payload),
  }
}
