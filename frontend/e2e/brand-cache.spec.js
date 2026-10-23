import { test, expect } from '@playwright/test'
import http from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, extname } from 'node:path'

test('brand worker upgrades v3, preserves sessions and excludes private API', async ({ browser }) => {
  const server = http.createServer((request, response) => {
    if (request.url === '/old-sw.js') {
      response.setHeader('Content-Type', 'application/javascript')
      response.end(`self.addEventListener('install',e=>{e.waitUntil(caches.open('yazoo-public-assets-v3').then(c=>c.put('/brand/yazoo-symbol.svg',new Response('old'))));self.skipWaiting()});self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()))`)
      return
    }
    const pathname = new URL(request.url, 'http://local').pathname
    const file = resolve('public', `.${pathname}`)
    if (pathname !== '/' && existsSync(file)) {
      response.setHeader('Content-Type', extname(file) === '.js' ? 'application/javascript' : extname(file) === '.png' ? 'image/png' : 'text/plain')
      response.end(readFileSync(file))
    } else {
      response.setHeader('Content-Type', 'text/html')
      response.end('<html><body>Worker QA</body></html>')
    }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:${server.address().port}`)
    await page.evaluate(async () => {
      localStorage.setItem('session-sentinel', 'preserved')
      await caches.open('unrelated-cache')
      await navigator.serviceWorker.register('/old-sw.js')
      await navigator.serviceWorker.ready
    })
    await page.waitForFunction(() => navigator.serviceWorker.controller)
    await page.evaluate(() => navigator.serviceWorker.register('/sw.js'))
    await page.waitForFunction(async () => (await caches.keys()).includes('yazoo-public-assets-v4-brand-2026') && !(await caches.keys()).includes('yazoo-public-assets-v3'))
    await page.reload()
    await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('/sw.js'))
    await page.evaluate(() => fetch('/api/private-qa'))
    const state = await page.evaluate(async () => ({
      session: localStorage.getItem('session-sentinel'),
      keys: await caches.keys(),
      requests: (await (await caches.open('yazoo-public-assets-v4-brand-2026')).keys()).map(r => new URL(r.url).pathname),
    }))
    expect(state.session).toBe('preserved')
    expect(state.keys).toContain('unrelated-cache')
    expect(state.requests.some(path => path.startsWith('/api'))).toBe(false)
    await context.setOffline(true)
    expect(await page.evaluate(async () => (await fetch('/brand/yazoo-inapp-2026.png')).headers.get('content-type'))).toBe('image/png')
  } finally {
    await context.close()
    await new Promise(resolve => server.close(resolve))
  }
})
