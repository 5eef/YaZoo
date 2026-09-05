import {
  jsonResponse,
  normalizeBackendOrigin,
} from './_shared/proxy.js'

const HEALTH_TIMEOUT_MS = 8_000

export async function onRequestGet(context) {
  let backendOrigin

  try {
    backendOrigin = normalizeBackendOrigin(context.env?.BACKEND_ORIGIN)
  } catch {
    return statusResponse('unavailable', 500)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)

  try {
    const response = await fetch(`${backendOrigin}/health/live`, {
      headers: { Accept: 'application/json' },
      redirect: 'manual',
      signal: controller.signal,
    })
    const contentType = response.headers.get('content-type') ?? ''

    if (response.ok && contentType.toLowerCase().includes('application/json')) {
      const payload = await response.json()

      if (payload?.status === 'ok') {
        return statusResponse('ready')
      }
    }

    if (response.status >= 400 && response.status < 500) {
      return statusResponse('unavailable', 503)
    }

    return statusResponse('waking', 503)
  } catch {
    return statusResponse('waking', 503)
  } finally {
    clearTimeout(timeoutId)
  }
}

export function statusResponse(status, responseStatus = 200) {
  const headers = responseStatus === 200 ? {} : { 'Retry-After': '4' }

  return jsonResponse({ status }, responseStatus, headers)
}
