export function classifyApiError(error) {
  const status = error?.response?.status
  if (status === 409 && error?.response?.data?.error === 'showcase.uploads_disabled') return 'uploadsDisabled'
  if (status === 503 && error?.response?.data?.code === 'DEMO_BACKEND_WAKING') return 'backendWaking'
  if (status === 401 || status === 419) return 'sessionExpired'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'notFound'
  if (status === 409) return 'conflict'
  if (status === 422) return 'validation'
  if (status === 429) return 'tooManyRequests'
  if (status >= 500) return 'serverTemporary'
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') return 'timeout'
  if (error?.code === 'ERR_NETWORK') return 'network'
  return 'generic'
}
