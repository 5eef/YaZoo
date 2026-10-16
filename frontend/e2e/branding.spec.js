import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { mockApi } from './branding-fixtures'
const output = '../output/qa/ideawave-branding'
for (const width of [320, 360, 375, 390, 412, 768, 1024, 1440]) {
  for (const locale of ['fr', 'ar', 'en']) {
    for (const theme of ['light', 'dark', 'system']) {
      test(`branding ${width} ${locale} ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
        await page.addInitScript(({ locale, theme }) => {
          localStorage.setItem('yazoo-cookie-consent', JSON.stringify({ cookies_necessary: true, cookies_analytics: false }))
          localStorage.setItem('yazoo-locale', locale)
          localStorage.setItem('yazoo-theme', theme)
        }, { locale, theme })
        await mockApi(page, false)
        const errors = []
        page.on('pageerror', error => errors.push(error.message))
        for (const route of ['/', '/login', '/register']) {
          await page.goto(route)
    await expect(page.getByTestId('route-loader')).toHaveCount(0)
    await expect(page.locator('main')).toBeVisible()
          await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
          const logos = page.locator('[data-brand-logo]')
          await expect(logos.first()).toBeVisible()
          await expect.poll(() => logos.evaluateAll(nodes => nodes.every(n => n.complete && n.naturalWidth === 2000 && getComputedStyle(n).objectFit === 'contain'))).toBe(true)
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
          if (route !== '/') {
            const full = page.locator('[data-brand-logo="full"]')
            await expect(full).toHaveAttribute('src', `/brand/login-${theme === 'light' ? 'light' : 'dark'}-2026.png`)
            if (theme === 'system') {
              await page.emulateMedia({ colorScheme: 'light' })
              await expect(full).toHaveAttribute('src', '/brand/login-light-2026.png')
              await page.emulateMedia({ colorScheme: 'dark' })
              await expect(full).toHaveAttribute('src', '/brand/login-dark-2026.png')
            }
          }
          if (locale === 'fr' && [390, 1440].includes(width) && theme !== 'system') {
            mkdirSync(output, { recursive: true })
            await page.screenshot({ path: `${output}/${route === '/' ? 'home' : route.slice(1)}-${width}-${theme}.png`, fullPage: true })
          }
        }
        expect(errors).toEqual([])
      })
    }
  }
}
test('authenticated demo branding and screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockApi(page, true)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => { localStorage.setItem('yazoo-onboarding-v1:1', 'done'); localStorage.setItem('yazoo-cookie-consent', 'necessary'); localStorage.setItem('yazoo-locale', 'fr'); localStorage.setItem('yazoo-theme', 'light') })
  for (const route of ['/feed', '/marketplace', '/marketplace/veterinarians', '/marketplace/services', '/marketplace/products', '/communities', '/messages', '/reservations', '/profile', '/settings', '/about']) {
    await page.goto(route)
    await expect(page.getByTestId('route-loader')).toHaveCount(0)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('[data-brand-logo]').first()).toBeAttached()
    await expect.poll(() => page.locator('[data-brand-logo]').evaluateAll(nodes => nodes.every(n => n.complete && n.naturalWidth > 0 && n.src.includes('2026.png')))).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    expect(errors).toEqual([])
    await page.screenshot({ path: `${output}/demo-${route.slice(1).replaceAll('/', '-')}.png`, fullPage: true })
  }
})


