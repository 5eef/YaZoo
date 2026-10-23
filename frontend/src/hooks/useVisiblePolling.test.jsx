import { renderHook, act } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useVisiblePolling } from './useVisiblePolling'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
it('pauses hidden tabs, resumes bounded reads, and never overlaps or survives unmount', async () => {
  vi.useFakeTimers()
  let visibility = 'visible'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
  let release
  const read = vi.fn(() => new Promise(resolve => { release = resolve }))
  const { unmount } = renderHook(() => useVisiblePolling(read, { intervalMs: 10000 }))
  await act(() => vi.advanceTimersByTimeAsync(10000))
  expect(read).toHaveBeenCalledTimes(1)
  await act(() => vi.advanceTimersByTimeAsync(60000))
  expect(read).toHaveBeenCalledTimes(1)
  visibility = 'hidden'
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  await act(async () => { release(); await Promise.resolve() })
  await act(() => vi.advanceTimersByTimeAsync(60000))
  expect(read).toHaveBeenCalledTimes(1)
  visibility = 'visible'
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  await act(() => vi.advanceTimersByTimeAsync(1))
  expect(read).toHaveBeenCalledTimes(2)
  unmount()
  await act(async () => { release(); await Promise.resolve() })
  await act(() => vi.advanceTimersByTimeAsync(60000))
  expect(read).toHaveBeenCalledTimes(2)
})
it('backs off failed GET cycles and uses the latest callback without resetting its clock', async () => {
  vi.useFakeTimers()
  const read = vi.fn().mockRejectedValueOnce(new Error('503')).mockResolvedValue(undefined)
  const { rerender } = renderHook(({ fn }) => useVisiblePolling(fn, { intervalMs: 10000 }), { initialProps: { fn: read } })
  await act(() => vi.advanceTimersByTimeAsync(10000))
  await act(() => vi.advanceTimersByTimeAsync(10000))
  expect(read).toHaveBeenCalledTimes(1)
  const next = vi.fn().mockResolvedValue(undefined)
  rerender({ fn: next })
  await act(() => vi.advanceTimersByTimeAsync(10000))
  expect(next).toHaveBeenCalledTimes(1)
})
