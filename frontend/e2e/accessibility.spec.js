import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const cases = [
  { route: '/', authenticated: false, locale: 'fr', theme: 'light', dir: 'ltr', width: 390, height: 844 },
  { route: '/about', authenticated: false, locale: 'ar', theme: 'dark', dir: 'rtl', width: 1366, height: 768 },
  { route: '/privacy', authenticated: false, locale: 'fr', theme: 'dark', dir: 'ltr', width: 390, height: 844 },
  { route: '/login', authenticated: false, locale: 'ar', theme: 'light', dir: 'rtl', width: 390, height: 844 },
  { route: '/register', authenticated: false, locale: 'fr', theme: 'light', dir: 'ltr', width: 1366, height: 768 },
  { route: '/feed', authenticated: true, locale: 'ar', theme: 'dark', dir: 'rtl', width: 390, height: 844 },
  { route: '/marketplace/animals', authenticated: true, locale: 'fr', theme: 'light', dir: 'ltr', width: 1366, height: 768 },
  { route: '/admin/stats', authenticated: true, locale: 'ar', theme: 'dark', dir: 'rtl', width: 1366, height: 768 },
]

for (const entry of cases) {
      test(`${entry.route} ${entry.locale} ${entry.theme} ${entry.width}px has no critical or serious axe violation`, async ({ page }) => {
        const runtimeErrors = []
        page.on('pageerror', (error) => runtimeErrors.push(error.message))
        await page.setViewportSize({ width: entry.width, height: entry.height })
        await mockApi(page, entry.authenticated)
        await page.addInitScript(({ locale, theme }) => {
          window.localStorage.setItem('yazoo-locale', locale)
          window.localStorage.setItem('yazoo-theme', theme)
        }, entry)

        await page.goto(entry.route)
        await page.waitForTimeout(500)
        expect(runtimeErrors).toEqual([])
        await expect(page.locator('#root')).not.toBeEmpty()
        await expect(page.locator('html')).toHaveAttribute('dir', entry.dir)

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()
        const blocking = results.violations.filter(({ impact }) => ['critical', 'serious'].includes(impact))
        expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])

        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
        await page.keyboard.press('Tab')
        expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true)
      })
}

async function mockApi(page, authenticated) {
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (!pathname.startsWith('/api/')) return route.fallback()
    const path = pathname.replace(/^\/api/, '')
    if (path === '/auth/me') {
      return json(route, authenticated ? { user: admin } : { message: 'Unauthenticated.' }, authenticated ? 200 : 401)
    }
    if (path === '/legal/config') return json(route, { entityName: 'YaZoo test', privacyContactEmail: 'privacy@yazoo.test', dataControllerName: 'YaZoo test', dataRetentionDays: 365, dataRequestResponseDays: 30 })
    if (path === '/marketplace/public-preview') return json(route, { data: { animals: [], products: [], services: [], veterinarians: [] } })
    if (path === '/posts' || path === '/stories' || path === '/animals') return json(route, { data: [], meta: {} })
    if (path === '/notifications/unread-count' || path === '/messages/unread-count') return json(route, { data: { unreadCount: 0, unread_count: 0 } })
    if (path === '/admin/stats') return json(route, { period_days: 30, revenue_yazoo: 'not_measured' })

    return json(route, { data: [] })
  })
}

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

const admin = {
  id: 1,
  name: 'Admin YaZoo',
  email: 'admin@yazoo.test',
  isAdmin: true,
  marketplacePublishing: { canPublish: true },
}
