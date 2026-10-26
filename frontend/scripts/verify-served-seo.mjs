import assert from 'node:assert/strict'
import process from 'node:process'
import { chromium } from '@playwright/test'
import { JSDOM } from 'jsdom'

const baseURL = process.env.SEO_HTTP_BASE_URL
assert.ok(baseURL, 'Set SEO_HTTP_BASE_URL to the candidate HTTP server')
const targetOrigin = 'https://yazoo-showcase.pages.dev'
const paths = ['/', '/fr', '/en', '/ar', '/about', '/pros', '/partner', '/discover/services', '/discover/veterinarians']
const browser = await chromium.launch()
const rows = []
try {
  for (const pathname of paths) {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    const response = await page.goto(`${baseURL}${pathname}`)
    assert.equal(response.status(), 200, pathname)
    const document = new JSDOM(await response.text()).window.document
    const discovery = pathname.startsWith('/discover/')
    const canonical = pathname === '/' ? '/fr' : pathname
    assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1)
    assert.equal(document.querySelector('link[rel="canonical"]').href, `${targetOrigin}${canonical}`)
    assert.equal(document.querySelector('meta[property="og:url"]').content, `${targetOrigin}${canonical}`)
    assert.equal(document.querySelector('meta[property="og:title"]').content, document.title)
    assert.equal(document.querySelector('meta[name="twitter:title"]').content, document.title)
    const ogImage = new URL(document.querySelector('meta[property="og:image"]').content)
    assert.equal((await context.request.get(`${baseURL}${ogImage.pathname}`)).status(), 200)
    const schema = [...document.querySelectorAll('script[type="application/ld+json"]')].map((element) => JSON.parse(element.textContent))
    assert.ok(!JSON.stringify(schema).match(/"@type":"(?:Offer|Product|Service|Organization)"/))
    if (discovery) {
      assert.match(response.headers()['x-robots-tag'], /noindex/)
      assert.match(document.querySelector('meta[name="robots"]').content, /noindex/)
    } else {
      assert.equal(await page.locator('h1').count(), 1)
      assert.ok((await page.locator('#root').innerText()).length > 500)
      assert.ok(!response.headers()['x-robots-tag']?.includes('noindex'))
      assert.ok(!document.querySelector('#root').textContent.match(/Pilot Demo Vet|Chat public a adopter|rc@example\.test/))
    }
    const initialHeading = await page.locator('h1').count() ? await page.locator('h1').textContent() : null
    for (const element of document.querySelectorAll('img[src],link[as="image"][href]')) {
      const asset = element.getAttribute('src') || element.getAttribute('href')
      if (asset.startsWith('/')) assert.equal((await context.request.get(`${baseURL}${asset}`)).status(), 200, asset)
    }
    const interactive = await browser.newContext({ locale: 'fr-FR' })
    const interactivePage = await interactive.newPage()
    const errors = []
    interactivePage.on('pageerror', (error) => errors.push(error.message))
    const mounted = interactivePage.waitForResponse((response) => new URL(response.url()).pathname === '/api/legal/config')
    await interactivePage.goto(`${baseURL}${pathname}`)
    await mounted // Footer's effect runs after React commits, rather than trusting the initial HTML.
    await interactivePage.waitForSelector('h1')
    assert.equal(await interactivePage.locator('h1').count(), 1, `duplicate root on ${pathname}`)
    if (initialHeading) assert.equal(await interactivePage.locator('h1').textContent(), initialHeading)
    await interactivePage.waitForFunction(() => document.querySelector('link[rel="canonical"]')?.href.startsWith('https://'))
    assert.equal(await interactivePage.locator('link[rel="canonical"]').count(), 1)
    assert.equal(await interactivePage.locator('link[rel="canonical"]').getAttribute('href'), `${targetOrigin}${canonical}`)
    assert.equal(await interactivePage.locator('link[hreflang]').count(), /^\/(fr|en|ar)?$/.test(pathname) ? 3 : 0)
    assert.deepEqual(errors, [], pathname)
    rows.push({ pathname, status: response.status(), noJavaScript: discovery ? 'SPA shell, noindex (known limit)' : 'visible main content', javaScript: 'single root and h1, no pageerror', xRobotsTag: response.headers()['x-robots-tag'] || null, canonical: `${targetOrigin}${canonical}`, test: 'PASS' })
    await interactive.close()
    await context.close()
  }
  const api = await browser.newContext()
  const sitemap = await api.request.get(`${baseURL}/sitemap.xml`)
  assert.equal(sitemap.status(), 200)
  const xml = new JSDOM(await sitemap.text(), { contentType: 'text/xml' }).window.document
  assert.equal(xml.querySelector('parsererror'), null)
  assert.deepEqual([...xml.querySelectorAll('loc')].map((element) => element.textContent).sort(), ['/fr', '/en', '/ar', '/about', '/pros', '/partner'].map((pathname) => `${targetOrigin}${pathname}`).sort())
  const robots = await api.request.get(`${baseURL}/robots.txt`)
  assert.equal(robots.status(), 200)
  assert.ok((await robots.text()).includes(`Sitemap: ${targetOrigin}/sitemap.xml`))
  for (const pathname of ['/messages', '/admin/moderation', '/settings/privacy', '/profile/123', '/api/auth/me', '/api/marketplace/public-preview', '/demo-backend-status']) {
    const response = await api.request.get(`${baseURL}${pathname}`)
    assert.match(response.headers()['x-robots-tag'], /noindex/, `HTTP noindex missing on ${pathname}`)
    rows.push({ pathname, status: response.status(), xRobotsTag: response.headers()['x-robots-tag'], test: 'PASS' })
  }
  await api.close()
  console.log(JSON.stringify(rows, null, 2))
} finally { await browser.close() }
