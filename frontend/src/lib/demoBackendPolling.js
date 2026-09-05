export const DEMO_BACKEND_RETRY_DELAYS_MS = Object.freeze([
  0,
  2_000,
  4_000,
  7_000,
  12_000,
  20_000,
  30_000,
])

export const DEMO_BACKEND_MAX_WAIT_MS = 90_000
const STATUS_REQUEST_TIMEOUT_MS = 10_000

export async function pollDemoBackend({
  fetchImpl = globalThis.fetch,
  maxWaitMs = DEMO_BACKEND_MAX_WAIT_MS,
  onStatus,
  retryDelaysMs = DEMO_BACKEND_RETRY_DELAYS_MS,
  signal,
}) {
  const startedAt = Date.now()
  onStatus('checking')

  for (const delayMs of retryDelaysMs) {
    if (signal.aborted) {
      return 'cancelled'
    }

    const elapsedMs = Date.now() - startedAt
    const remainingMs = maxWaitMs - elapsedMs

    if (remainingMs <= 0) {
      break
    }

    if (delayMs > 0) {
      try {
        await abortableDelay(Math.min(delayMs, remainingMs), signal)
      } catch {
        return 'cancelled'
      }
    }

    if (signal.aborted || Date.now() - startedAt >= maxWaitMs) {
      break
    }

    const probeStatus = await probeDemoBackend(fetchImpl, signal)

    if (probeStatus === 'ready') {
      onStatus('ready')
      return 'ready'
    }

    if (probeStatus === 'unavailable') {
      onStatus('unavailable')
      return 'unavailable'
    }

    onStatus('waking')
  }

  if (!signal.aborted) {
    onStatus('unavailable')
  }

  return signal.aborted ? 'cancelled' : 'unavailable'
}

async function probeDemoBackend(fetchImpl, parentSignal) {
  const requestController = new AbortController()
  const abortRequest = () => requestController.abort()
  const timeoutId = globalThis.setTimeout(abortRequest, STATUS_REQUEST_TIMEOUT_MS)

  parentSignal.addEventListener('abort', abortRequest, { once: true })

  try {
    const response = await fetchImpl('/demo-backend-status', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: requestController.signal,
    })
    const contentType = response.headers.get('content-type') ?? ''

    if (!contentType.toLowerCase().includes('application/json')) {
      return 'waking'
    }

    const payload = await response.json()

    if (response.ok && payload?.status === 'ready') {
      return 'ready'
    }

    return payload?.status === 'unavailable' ? 'unavailable' : 'waking'
  } catch {
    return 'waking'
  } finally {
    globalThis.clearTimeout(timeoutId)
    parentSignal.removeEventListener('abort', abortRequest)
  }
}

function abortableDelay(delayMs, signal) {
  return new Promise((resolve, reject) => {
    const handleAbort = () => {
      globalThis.clearTimeout(timeoutId)
      reject(new DOMException('Polling cancelled', 'AbortError'))
    }
    const timeoutId = globalThis.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort)
      resolve()
    }, delayMs)

    signal.addEventListener('abort', handleAbort, { once: true })
  })
}
