const REQUEST_HEADER_ALLOWLIST = new Set([
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'idempotency-key',
  'origin',
  'referer',
  'user-agent',
  'x-csrf-token',
  'x-requested-with',
  'x-socket-id',
  'x-xsrf-token',
])

const RESPONSE_HEADER_ALLOWLIST = new Set([
  'cache-control',
  'content-disposition',
  'content-language',
  'content-type',
  'etag',
  'expires',
  'last-modified',
  'location',
  'retry-after',
  'vary',
  'x-request-id',
])

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const SAFE_REQUEST_TIMEOUT_MS = 12_000
const MUTATION_REQUEST_TIMEOUT_MS = 65_000

export async function proxyRequest(context, { expectedJson = false } = {}) {
  let backendOrigin

  try {
    backendOrigin = normalizeBackendOrigin(context.env?.BACKEND_ORIGIN)
  } catch {
    return jsonResponse(
      { code: 'DEMO_PROXY_MISCONFIGURED', message: 'Demo proxy is unavailable.' },
      500,
    )
  }

  const incomingUrl = new URL(context.request.url)
  const upstreamUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, backendOrigin)
  const method = context.request.method.toUpperCase()
  const requestHeaders = copyRequestHeaders(context.request.headers)

  requestHeaders.set('X-Forwarded-Host', incomingUrl.host)
  requestHeaders.set('X-Forwarded-Proto', incomingUrl.protocol.replace(':', ''))

  const controller = new AbortController()
  const timeoutMs = SAFE_METHODS.has(method)
    ? SAFE_REQUEST_TIMEOUT_MS
    : MUTATION_REQUEST_TIMEOUT_MS
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const requestInit = {
      method,
      headers: requestHeaders,
      redirect: 'manual',
      signal: controller.signal,
    }

    if (!SAFE_METHODS.has(method)) {
      requestInit.body = await context.request.arrayBuffer()
    }

    const upstreamResponse = await fetch(upstreamUrl, requestInit)
    const contentType = upstreamResponse.headers.get('content-type') ?? ''

    if (expectedJson && contentType.toLowerCase().includes('text/html')) {
      return backendWakingResponse()
    }

    return buildProxyResponse(upstreamResponse, backendOrigin, incomingUrl.origin)
  } catch {
    return backendWakingResponse()
  } finally {
    clearTimeout(timeoutId)
  }
}

export function normalizeBackendOrigin(rawOrigin) {
  if (typeof rawOrigin !== 'string' || rawOrigin.trim() === '') {
    throw new Error('BACKEND_ORIGIN is required')
  }

  const origin = new URL(rawOrigin.trim())
  const localDevelopmentOrigin =
    origin.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(origin.hostname)

  if (origin.protocol !== 'https:' && !localDevelopmentOrigin) {
    throw new Error('BACKEND_ORIGIN must use HTTPS')
  }

  if (
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  ) {
    throw new Error('BACKEND_ORIGIN must be an origin without credentials or a path')
  }

  return origin.origin
}

export function sanitizeSetCookie(cookie) {
  const withoutDomain = cookie.replace(/;\s*Domain=[^;]*/gi, '')

  return /;\s*Secure(?:;|$)/i.test(withoutDomain)
    ? withoutDomain
    : `${withoutDomain}; Secure`
}

export function backendWakingResponse() {
  return jsonResponse(
    {
      code: 'DEMO_BACKEND_WAKING',
      message: 'The demo server is starting. Please try again shortly.',
    },
    503,
    { 'Retry-After': '4' },
  )
}

export function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  })
}

function copyRequestHeaders(headers) {
  const copiedHeaders = new Headers()

  for (const [name, value] of headers.entries()) {
    if (REQUEST_HEADER_ALLOWLIST.has(name.toLowerCase())) {
      copiedHeaders.set(name, value)
    }
  }

  return copiedHeaders
}

function buildProxyResponse(upstreamResponse, backendOrigin, publicOrigin) {
  const responseHeaders = new Headers()

  for (const [name, value] of upstreamResponse.headers.entries()) {
    const lowerName = name.toLowerCase()

    if (RESPONSE_HEADER_ALLOWLIST.has(lowerName) || lowerName.startsWith('x-ratelimit-')) {
      responseHeaders.set(name, rewriteLocation(value, lowerName, backendOrigin, publicOrigin))
    }
  }

  for (const cookie of getSetCookieHeaders(upstreamResponse.headers)) {
    responseHeaders.append('Set-Cookie', sanitizeSetCookie(cookie))
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
}

function rewriteLocation(value, headerName, backendOrigin, publicOrigin) {
  if (headerName !== 'location') {
    return value
  }

  try {
    const location = new URL(value, backendOrigin)

    if (location.origin !== backendOrigin) {
      return value
    }

    return `${publicOrigin}${location.pathname}${location.search}${location.hash}`
  } catch {
    return value
  }
}

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }

  if (typeof headers.getAll === 'function') {
    return headers.getAll('Set-Cookie')
  }

  const cookie = headers.get('Set-Cookie')

  return cookie ? [cookie] : []
}
