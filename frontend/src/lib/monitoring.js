import { getMonitoringEndpoint, isMonitoringEnabled } from './appConfig'

let monitoringStarted = false
let monitoringUser = null

const MONITORING_TIMEOUT_MS = 5000

const recentReports = new Map()

function buildPayload(errorLike, context = {}, source = 'frontend') {
  return {
    message: getErrorMessage(errorLike),
    stack: getErrorStack(errorLike),
    source,
    url: typeof globalThis.location !== 'undefined' ? globalThis.location.href : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    context,
    user: monitoringUser,
  }
}

function getErrorMessage(errorLike) {
  if (errorLike instanceof Error) {
    return errorLike.message
  }

  if (typeof errorLike === 'string') {
    return errorLike
  }

  return 'Erreur frontend inattendue.'
}

function getErrorStack(errorLike) {
  if (errorLike instanceof Error) {
    return errorLike.stack ?? null
  }

  if (typeof errorLike?.stack === 'string') {
    return errorLike.stack
  }

  return null
}

function normalizeUnhandledRejectionReason(reason) {
  if (reason instanceof Error) {
    return reason
  }

  if (typeof reason === 'string') {
    return new Error(reason)
  }

  return new Error('Promesse rejetee sans gestionnaire.')
}

function shouldSkipReport(payload) {
  const fingerprint = `${payload.source}|${payload.message}|${payload.stack ?? ''}`
  const previousReportAt = recentReports.get(fingerprint)

  if (previousReportAt && Date.now() - previousReportAt < 15000) {
    return true
  }

  recentReports.set(fingerprint, Date.now())

  return false
}

export function setMonitoringUser(user) {
  monitoringUser = user
    ? {
        id: user.id ?? null,
        name: user.name ?? null,
        email: user.email ?? null,
        isAdmin: user.isAdmin ?? false,
      }
    : null
}

export async function reportFrontendError(errorLike, context = {}, source = 'frontend') {
  if (!isMonitoringEnabled()) {
    return false
  }

  const payload = buildPayload(errorLike, context, source)

  if (shouldSkipReport(payload)) {
    return false
  }

  const abortController = new AbortController()
  const timeoutId = globalThis.setTimeout(
    () => abortController.abort(),
    MONITORING_TIMEOUT_MS,
  )

  try {
    const response = await fetch(getMonitoringEndpoint(), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    })

    return response.ok
  } catch {
    return false
  } finally {
    globalThis.clearTimeout(timeoutId)
  }
}

export function startFrontendMonitoring() {
  if (
    monitoringStarted ||
    !isMonitoringEnabled() ||
    typeof globalThis.addEventListener !== 'function'
  ) {
    return
  }

  monitoringStarted = true

  globalThis.addEventListener('error', (event) => {
    reportFrontendError(event.error ?? event.message, {
      filename: event.filename ?? null,
      lineno: event.lineno ?? null,
      colno: event.colno ?? null,
    })
  })

  globalThis.addEventListener('unhandledrejection', (event) => {
    reportFrontendError(
      normalizeUnhandledRejectionReason(event.reason),
      {
        type: 'unhandledrejection',
      },
    )
  })
}
