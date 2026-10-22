import { afterEach, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ config: null, disconnect: vi.fn() }))
vi.mock('laravel-echo', () => ({ default: class {
  constructor(config) { mocks.config = config }
  disconnect() { mocks.disconnect() }
} }))
vi.mock('pusher-js', () => ({ default: class {} }))

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/' })

test('private cookie authorization carries CSRF and disconnect closes the connection', async () => {
  vi.resetModules()
  vi.stubEnv('VITE_REALTIME_ENABLED', 'true')
  vi.stubEnv('VITE_REVERB_APP_KEY', 'fixture-public-key')
  document.cookie = 'XSRF-TOKEN=fixture%3Dcsrf; path=/'
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ auth: 'fixture' }) })
  vi.stubGlobal('fetch', fetch)
  const realtime = await import('./realtime')
  const unsubscribe = realtime.subscribeRealtimeStatus(() => {})
  await vi.waitFor(() => expect(mocks.config).toBeTruthy())
  expect(mocks.config.broadcaster).toBe('reverb')
  const callback = vi.fn()
  await mocks.config.authorizer({ name: 'private-users.123' }).authorize('1.2', callback)
  expect(fetch).toHaveBeenCalledWith('/broadcasting/auth', expect.objectContaining({
    credentials: 'include',
    headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'fixture=csrf' }),
    body: JSON.stringify({ socket_id: '1.2', channel_name: 'private-users.123' }),
  }))
  expect(callback).toHaveBeenCalledWith(null, { auth: 'fixture' })
  realtime.disconnectRealtime()
  expect(mocks.disconnect).toHaveBeenCalled()
  unsubscribe()
})
