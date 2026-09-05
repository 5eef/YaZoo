import { describe, expect, it, vi } from 'vitest'

import {
  normalizeBackendOrigin,
  proxyRequest,
  sanitizeSetCookie,
} from '../../functions/_shared/proxy.js'

describe('Cloudflare Pages reverse proxy', () => {
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
