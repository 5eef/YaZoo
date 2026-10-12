export class ApiError extends Error {
  status: number;
  fields: Record<string, string[]>;
  code?: string;
  retryAfter?: number;
  category: 'SHOWCASE_UPLOADS_DISABLED' | 'NETWORK_ERROR' | 'TIMEOUT' | 'DEMO_BACKEND_WAKING' | 'AUTH_ERROR' | 'VALIDATION_ERROR' | 'SERVER_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'RATE_LIMITED' | 'INVALID_RESPONSE' | 'CLIENT_ERROR';
  constructor(status: number, fields: Record<string, string[]> = {}, code?: string, retryAfter?: number) {
    // Only expose a known, public server message; arbitrary upstream text may contain secrets.
    super(code === 'DEMO_BACKEND_WAKING' ? 'The demo server is starting. Try again in a few seconds.' : `API ${status}`);
    this.status = status; this.fields = fields; this.code = code; this.retryAfter = retryAfter;
    this.category = status === 409 && code === 'SHOWCASE_UPLOADS_DISABLED' ? 'SHOWCASE_UPLOADS_DISABLED' : code === 'CLIENT_ERROR' || code === 'INVALID_API_PATH' ? 'CLIENT_ERROR' : code === 'INVALID_RESPONSE' ? 'INVALID_RESPONSE' : status === 503 && code === 'DEMO_BACKEND_WAKING' ? 'DEMO_BACKEND_WAKING' : status === 0 ? (code === 'REQUEST_TIMEOUT' ? 'TIMEOUT' : 'NETWORK_ERROR') : status === 401 ? 'AUTH_ERROR' : status === 422 ? 'VALIDATION_ERROR' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : status === 429 ? 'RATE_LIMITED' : status === 403 || status === 419 ? 'FORBIDDEN' : status >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR';
  }
}
export function errorKey(status: number, code?: string) {
  if (code === 'CLIENT_ERROR' || code === 'INVALID_API_PATH') return 'unexpected';
  if (status === 503 && code === 'DEMO_BACKEND_WAKING') return 'demoBackendWaking';
  if (status === 409 && code === 'SHOWCASE_UPLOADS_DISABLED') return 'demoUploadsDisabled';
  if (status === 0) return code === 'REQUEST_TIMEOUT' ? 'timeout' : 'offline';
  if (status === 401) return 'expired';
  if (status === 403 || status === 419) return 'forbidden';
  if (status === 422) return 'validation';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (code === 'INVALID_RESPONSE') return 'invalidResponse';
  if (status === 429) return 'limited';
  return 'unavailable';
}
export function failureKey(failure: unknown) {
  return failure instanceof ApiError ? errorKey(failure.status, failure.code) : 'unexpected';
}
export function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Invalid API URL');
  const base = value.replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
}
