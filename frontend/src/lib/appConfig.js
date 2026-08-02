const DEFAULT_NOTIFICATIONS_POLL_MS = 30000

function parseBoolean(value, fallback = false) {
  if (typeof value !== 'string') {
    return fallback
  }

  const normalizedValue = value.trim().toLowerCase()

  if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) {
    return true
  }

  if (['0', 'false', 'no', 'off'].includes(normalizedValue)) {
    return false
  }

  return fallback
}

function trimTrailingSlash(value) {
  let endIndex = value.length

  while (endIndex > 0 && value.charAt(endIndex - 1) === '/') {
    endIndex -= 1
  }

  return value.slice(0, endIndex)
}

function normalizeApiBaseUrl(value) {
  const normalizedUrl = trimTrailingSlash(value.trim())

  if (normalizedUrl.toLowerCase().endsWith('/api')) {
    return normalizedUrl
  }

  return `${normalizedUrl}/api`
}

function getDefaultApiUrl() {
  if (typeof globalThis.location === 'undefined') {
    return 'http://localhost:8000/api'
  }

  return '/api'
}

export function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL

  return normalizeApiBaseUrl(
    typeof configuredUrl === 'string' && configuredUrl.trim()
      ? configuredUrl
      : getDefaultApiUrl(),
  )
}

export function getBackendBaseUrl() {
  const apiBaseUrl = getApiBaseUrl()

  return apiBaseUrl.endsWith('/api') ? apiBaseUrl.slice(0, -4) : apiBaseUrl
}

export function getBroadcastAuthUrl() {
  return `${getBackendBaseUrl()}/broadcasting/auth`
}

export function getMonitoringEndpoint() {
  return trimTrailingSlash(
    import.meta.env.VITE_MONITORING_ENDPOINT ??
      `${getApiBaseUrl()}/monitoring/frontend-error`,
  )
}

export function getNotificationsPollMs() {
  const parsedValue = Number(
    import.meta.env.VITE_NOTIFICATIONS_POLL_MS ?? DEFAULT_NOTIFICATIONS_POLL_MS,
  )

  if (!Number.isFinite(parsedValue) || parsedValue < 5000) {
    return DEFAULT_NOTIFICATIONS_POLL_MS
  }

  return parsedValue
}

export function isRealtimeEnabled() {
  return parseBoolean(import.meta.env.VITE_REALTIME_ENABLED, false)
}

export function isMonitoringEnabled() {
  return parseBoolean(import.meta.env.VITE_MONITORING_ENABLED, false)
}

export function getRealtimeConfig() {
  const browserLocation =
    typeof globalThis.location === 'undefined' ? null : globalThis.location
  const fallbackHost = browserLocation?.hostname ?? '127.0.0.1'
  const defaultScheme = browserLocation?.protocol === 'https:' ? 'https' : 'http'
  const defaultPort = defaultScheme === 'https' ? 443 : 8080
  const parsedPort = Number(import.meta.env.VITE_REVERB_PORT ?? defaultPort)

  return {
    key: import.meta.env.VITE_REVERB_APP_KEY ?? '',
    host: import.meta.env.VITE_REVERB_HOST ?? fallbackHost,
    port: Number.isFinite(parsedPort) ? parsedPort : defaultPort,
    scheme: import.meta.env.VITE_REVERB_SCHEME ?? defaultScheme,
  }
}
