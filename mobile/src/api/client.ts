import { ApiError, normalizeBaseUrl } from './errors';
import type { Locale } from '../i18n/messages';
const configured = process.env.EXPO_PUBLIC_API_URL || 'https://yazoo-showcase.pages.dev/api';
export const baseUrl = normalizeBaseUrl(configured);
let token: string | null = null;
let sessionEpoch = 0;
let invalidSession: () => void = () => {};
export function configureSession(value: string | null, onInvalid: () => void) { sessionEpoch++; token = value; invalidSession = onInvalid; }
export async function authorizeBroadcast(socketId: string, channel: string): Promise<{ auth: string }> {
  const requestToken = token;
  const requestEpoch = sessionEpoch;
  if (!requestToken) throw new ApiError(401);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${baseUrl.replace(/\/api$/, '')}/broadcasting/auth`, {
      method: 'POST', credentials: 'omit', signal: controller.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${requestToken}` },
      body: JSON.stringify({ socket_id: socketId, channel_name: channel }),
    });
    if (requestEpoch !== sessionEpoch) throw new ApiError(401);
    if (!response.ok) {
      if (response.status === 401) invalidSession();
      throw new ApiError(response.status || 401);
    }
    const result = await response.json();
    if (requestEpoch !== sessionEpoch || typeof result.auth !== 'string') throw new ApiError(401);
    return { auth: result.auth };
  } finally { clearTimeout(timeout); }
}
export function mediaHeaders(uri: string): Record<string, string> | undefined {
  try {
    const url = new URL(uri);
    return token && !url.username && !url.password && url.origin === new URL(baseUrl).origin && url.pathname.startsWith('/api/media/') ? { Authorization: `Bearer ${token}` } : undefined;
  } catch { return undefined; }
}
export async function api<T>(path: string, locale: Locale, method = 'GET', body?: unknown): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//') || /^\/api(?:\/|\?|$)/.test(path)) throw new ApiError(400, {}, 'INVALID_API_PATH');
  const controller = new AbortController();
  // The demo proxy can wait 65 seconds for a mutation; never replay it on timeout.
  const timeout = setTimeout(() => controller.abort(), method === 'GET' ? 20000 : 75000);
  const requestToken = token;
  const requestEpoch = sessionEpoch;
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
  try {
    const requestBody = body === undefined ? undefined : multipart ? body as FormData : JSON.stringify(body);
    let response: Response;
    try { response = await fetch(`${baseUrl}${path}`, {
      method, credentials: 'omit', signal: controller.signal,
      headers: { Accept: 'application/json', ...(!multipart ? { 'Content-Type': 'application/json' } : {}), 'Accept-Language': locale, ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}) },
      ...(requestBody === undefined ? {} : { body: requestBody })
    }); } catch { throw new ApiError(0, {}, controller.signal.aborted ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR'); }
    // Headers already prove rejection, even if the connection drops while reading the body.
    if (response.status === 401 && requestToken && requestEpoch === sessionEpoch) {
      invalidSession();
      throw new ApiError(401);
    }
    let text: string;
    try { text = await response.text(); } catch { throw new ApiError(0, {}, controller.signal.aborted ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR'); }
    let payload: unknown = {};
    if (text.trim()) {
      try { payload = JSON.parse(text); } catch { if (response.ok) throw new ApiError(502, {}, 'INVALID_RESPONSE'); }
    }
    if (response.ok && (payload === null || typeof payload !== 'object')) throw new ApiError(502, {}, 'INVALID_RESPONSE');
    if (requestEpoch !== sessionEpoch) {
      // Logout detaches local state immediately. Its acknowledgement contains no private data.
      if (path === '/auth/logout' && method === 'POST' && response.ok) return {} as T;
      throw new ApiError(401);
    }
    if (!response.ok) {
      const errors = payload && typeof payload === 'object' && 'errors' in payload ? payload.errors : {};
      const code = payload && typeof payload === 'object' && 'code' in payload && payload.code === 'DEMO_BACKEND_WAKING' ? payload.code : payload && typeof payload === 'object' && 'error' in payload && payload.error === 'showcase.uploads_disabled' ? 'SHOWCASE_UPLOADS_DISABLED' : undefined;
      const retryHeader = response.headers.get('Retry-After');
      const retryAfter = retryHeader && /^\d+$/.test(retryHeader) ? Math.min(Number(retryHeader), 300) : undefined;
      const fields = errors && typeof errors === 'object' && !Array.isArray(errors)
        ? Object.fromEntries(Object.entries(errors).filter(([, value]) => Array.isArray(value) && value.every(message => typeof message === 'string')))
        : {};
      throw new ApiError(response.status, fields, code, retryAfter);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, {}, 'CLIENT_ERROR');
  } finally { clearTimeout(timeout); }
}
