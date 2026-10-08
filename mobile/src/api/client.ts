import { ApiError, normalizeBaseUrl } from './errors';
import type { Locale } from '../i18n/messages';
const configured = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api';
export const baseUrl = normalizeBaseUrl(configured);
let token: string | null = null;
let invalidSession: () => void = () => {};
export function configureSession(value: string | null, onInvalid: () => void) { token = value; invalidSession = onInvalid; }
export function mediaHeaders(uri: string): Record<string, string> | undefined {
  try {
    const url = new URL(uri);
    return token && !url.username && !url.password && url.origin === new URL(baseUrl).origin && url.pathname.startsWith('/api/media/') ? { Authorization: `Bearer ${token}` } : undefined;
  } catch { return undefined; }
}
export async function api<T>(path: string, locale: Locale, method = 'GET', body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const requestToken = token;
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method, credentials: 'omit', signal: controller.signal,
      headers: { Accept: 'application/json', ...(!multipart ? { 'Content-Type': 'application/json' } : {}), 'Accept-Language': locale, ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}) },
      ...(body === undefined ? {} : { body: multipart ? body as FormData : JSON.stringify(body) })
    });
    const text = await response.text();
    let payload: unknown = {};
    if (text.trim()) {
      try { payload = JSON.parse(text); } catch { if (response.ok) throw new ApiError(502); }
    }
    if (response.ok && (payload === null || typeof payload !== 'object')) throw new ApiError(502);
    if (requestToken && requestToken !== token) throw new ApiError(401);
    if (!response.ok) {
      if (response.status === 401 && requestToken && requestToken === token) invalidSession();
      const errors = payload && typeof payload === 'object' && 'errors' in payload ? payload.errors : {};
      throw new ApiError(response.status, errors && typeof errors === 'object' && !Array.isArray(errors) ? errors as Record<string, string[]> : {});
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0);
  } finally { clearTimeout(timeout); }
}
