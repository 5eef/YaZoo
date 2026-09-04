import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8180'
const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const outputDirectory = path.resolve(currentDirectory, '../../docs/screenshots')

await mkdir(outputDirectory, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  locale: 'fr-FR',
})
await context.addInitScript(() => {
  globalThis.localStorage.setItem(
    'yazoo-cookie-consent',
    JSON.stringify({ cookies_necessary: true, cookies_analytics: false }),
  )
})
const page = await context.newPage()

try {
  await verifyResponsiveShowcase()
  await capture('/', 'yazoo-home.png')
  await capture('/discover/animals', 'yazoo-marketplace.png')
} finally {
  await browser.close()
}

async function verifyResponsiveShowcase() {
  const consoleErrors = []
  const failedRequests = []
  const unexpectedResponses = []
  const websockets = []

  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('401')) {
      consoleErrors.push(message.text())
    }
  })
  page.on('requestfailed', (request) => failedRequests.push(request.url()))
  page.on('response', (response) => {
    const isGuestProbe = response.status() === 401 && new URL(response.url()).pathname === '/api/auth/me'
    if (response.status() >= 400 && !isGuestProbe) {
      unexpectedResponses.push(`${response.status()} ${response.url()}`)
    }
  })
  page.on('websocket', (socket) => websockets.push(socket.url()))

  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/discover/animals']) {
      await page.goto(new URL(route, baseURL).toString(), { waitUntil: 'networkidle' })
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      if (overflows) {
        throw new Error(`Horizontal overflow at ${width}px on ${route}.`)
      }
    }
  }

  if (consoleErrors.length || failedRequests.length || unexpectedResponses.length || websockets.length) {
    throw new Error(JSON.stringify({ consoleErrors, failedRequests, unexpectedResponses, websockets }))
  }

  await page.setViewportSize({ width: 1440, height: 1000 })
  console.log('responsive=320,768,1440 console_errors=0 failed_requests=0 unexpected_http=0 websockets=0')
}

async function capture(route, filename) {
  const response = await page.goto(new URL(route, baseURL).toString(), {
    waitUntil: 'networkidle',
  })

  if (!response?.ok()) {
    throw new Error(`Screenshot route ${route} returned ${response?.status() ?? 'no response'}.`)
  }

  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: path.join(outputDirectory, filename),
    fullPage: true,
  })
}
