export class ApiError extends Error {
  status: number;
  fields: Record<string, string[]>;
  code?: string;
  retryAfter?: number;
  constructor(status: number, fields: Record<string, string[]> = {}, code?: string, retryAfter?: number) {
    // Only expose a known, public server message; arbitrary upstream text may contain secrets.
    super(code === 'DEMO_BACKEND_WAKING' ? 'The demo server is starting. Try again in a few seconds.' : `API ${status}`);
    this.status = status; this.fields = fields; this.code = code; this.retryAfter = retryAfter;
  }
}
export function errorKey(status: number, code?: string) {
  if (status === 503 && code === 'DEMO_BACKEND_WAKING') return 'demoBackendWaking';
  if (status === 0) return 'offline';
  if (status === 401) return 'expired';
  if (status === 403 || status === 419) return 'forbidden';
  if (status === 422) return 'validation';
  if (status === 429) return 'limited';
  return 'unavailable';
}
export function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Invalid API URL');
  const base = value.replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
}
