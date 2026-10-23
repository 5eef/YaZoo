import { describe, expect, it, vi } from 'vitest'

import {
  normalizeBackendOrigin,
  proxyRequest,
  sanitizeSetCookie,
} from '../../functions/_shared/proxy.js'

describe('Cloudflare Pages reverse proxy', () => {
  it('preserves logout expiry and separate CSRF cookies without caching private data', async () => {
    const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' })
    headers.append('Set-Cookie', 'yazoo_api_token=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Domain=backend.example.test; HttpOnly; SameSite=Lax')
    headers.append('Set-Cookie', 'XSRF-TOKEN=csrf; Path=/; Domain=backend.example.test; SameSite=Lax')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { headers })))
    const response = await proxyRequest({ env: { BACKEND_ORIGIN: 'https://backend.example.test' }, request: new Request('https://demo.pages.dev/api/auth/logout', { method: 'POST' }) }, { expectedJson: true })
    const cookies = response.headers.getSetCookie()
    expect(cookies).toHaveLength(2)
    expect(cookies[0]).toContain('Expires=Thu, 01 Jan 1970')
    expect(cookies.every(cookie => cookie.includes('Secure') && !cookie.includes('Domain='))).toBe(true)
    expect(response.headers.get('Cache-Control')).toBe('no-store, private')
  })
  it('preserves media byte ranges and streams the response body', async () => {
    const fetchImpl = vi.fn().mockImplementation(async (_url, init) => {
      expect(init.headers.get('Range')).toBe('bytes=2-5')
      return new Response('2345', { status: 206, headers: {
        'Content-Type': 'video/mp4', 'Content-Length': '4',
        'Content-Range': 'bytes 2-5/10', 'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      } })
    })
    vi.stubGlobal('fetch', fetchImpl)
    const response = await proxyRequest({ env: { BACKEND_ORIGIN: 'https://backend.example.test' },
      request: new Request('https://demo.pages.dev/api/media/posts/1', { headers: { Range: 'bytes=2-5' } }),
    })
    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Range')).toBe('bytes 2-5/10')
    expect(response.headers.get('Accept-Ranges')).toBe('bytes')
    expect(response.headers.get('Content-Length')).toBe('4')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    await expect(response.text()).resolves.toBe('2345')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
  it('transmet un appel mobile Sanctum sans cookie et conserve les reponses auth', async () => {
    for (const status of [200, 401]) {
      const fetchImpl = vi.fn().mockImplementation(async (_url, init) => {
        expect(init.headers.get('Authorization')).toBe('Bearer test-only-native-token')
        expect(init.headers.get('Accept-Language')).toBe('fr')
        expect(init.headers.get('Content-Type')).toBe('application/json')
        expect(init.headers.has('Cookie')).toBe(false)
        return new Response(JSON.stringify(status === 200 ? { id: 42, isAdmin: false } : { message: 'Unauthenticated.' }), {
          status, headers: { 'Content-Type': 'application/json' },
        })
      })
      vi.stubGlobal('fetch', fetchImpl)
      const response = await proxyRequest({
        env: { BACKEND_ORIGIN: 'https://yazoo-showcase.onrender.com' },
        request: new Request('https://yazoo-showcase.pages.dev/api/auth/me', {
          headers: { Authorization: 'Bearer test-only-native-token', 'Accept-Language': 'fr', 'Content-Type': 'application/json' },
        }),
      }, { expectedJson: true })
      expect(response.status).toBe(status)
      expect(fetchImpl).toHaveBeenCalledTimes(1)
      expect(String(fetchImpl.mock.calls[0][0])).toBe('https://yazoo-showcase.onrender.com/api/auth/me')
      if (status === 200) await expect(response.json()).resolves.toEqual({ id: 42, isAdmin: false })
    }
  })

  it('accepte seulement une origine admin HTTPS sans chemin', () => {
    expect(normalizeBackendOrigin('https://yazoo-showcase.onrender.com')).toBe(
      'https://yazoo-showcase.onrender.com',
    )
    expect(() => normalizeBackendOrigin('http://example.com')).toThrow()
    expect(() => normalizeBackendOrigin('https://example.com/api')).toThrow()
    expect(() => normalizeBackendOrigin('https://user:password@example.com')).toThrow()
  })

  it('ignore toute cible utilisateur et conserve methode, query, body et headers applicatifs', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchImpl)
    const request = new Request(
      'https://demo.pages.dev/api/listings?target=https://evil.test&draft=1',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer test-only-sanctum-token',
          'Accept-Language': 'ar',
          Cookie: 'yazoo_api_token=opaque',
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': 'opaque-xsrf',
          'X-Forwarded-Host': 'evil.test',
        },
        body: JSON.stringify({ title: 'Demo' }),
      },
    )

    const response = await proxyRequest({
      env: { BACKEND_ORIGIN: 'https://yazoo-showcase.onrender.com' },
      request,
    }, { expectedJson: true })

    expect(response.status).toBe(201)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [target, init] = fetchImpl.mock.calls[0]
    expect(String(target)).toBe(
      'https://yazoo-showcase.onrender.com/api/listings?target=https://evil.test&draft=1',
    )
    expect(init.method).toBe('POST')
    expect(init.headers.get('Cookie')).toBe('yazoo_api_token=opaque')
    expect(init.headers.get('Authorization')).toBe('Bearer test-only-sanctum-token')
    expect(init.headers.get('Accept-Language')).toBe('ar')
    expect(init.headers.get('Content-Type')).toBe('application/json')
    expect(init.headers.get('X-XSRF-TOKEN')).toBe('opaque-xsrf')
    expect(init.headers.get('X-Forwarded-Host')).toBe('demo.pages.dev')
    expect(new TextDecoder().decode(init.body)).toBe('{"title":"Demo"}')
  })

  it('normalise une page HTML origin en reponse JSON de reveil', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('<html>starting</html>', {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
      }),
    ))

    const response = await proxyRequest({
      env: { BACKEND_ORIGIN: 'https://yazoo-showcase.onrender.com' },
      request: new Request('https://demo.pages.dev/api/marketplace'),
    }, { expectedJson: true })

    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe('4')
    expect(response.headers.get('content-type')).toContain('application/json')
    await expect(response.json()).resolves.toMatchObject({
      code: 'DEMO_BACKEND_WAKING',
    })
  })

  it('ne rejoue jamais une mutation apres une erreur reseau', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('network down'))
    vi.stubGlobal('fetch', fetchImpl)

    const response = await proxyRequest({
      env: { BACKEND_ORIGIN: 'https://yazoo-showcase.onrender.com' },
      request: new Request('https://demo.pages.dev/api/profile', {
        method: 'PATCH',
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
      }),
    }, { expectedJson: true })

    expect(response.status).toBe(503)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('rend les cookies host-only et conserve Secure', () => {
    expect(
      sanitizeSetCookie(
        'yazoo_api_token=opaque; Path=/; Domain=yazoo-showcase.onrender.com; HttpOnly; SameSite=Lax',
      ),
    ).toBe('yazoo_api_token=opaque; Path=/; HttpOnly; SameSite=Lax; Secure')
  })
})
