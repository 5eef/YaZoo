import { expect, test } from '@playwright/test'
import { mockApi } from './branding-fixtures'

const routes = ['/feed', '/profile', '/marketplace/animals', '/marketplace/products', '/marketplace/services', '/marketplace/veterinarians', '/search', '/reservations', '/orders/history', '/messages', '/notifications', '/communities', '/settings', '/admin/moderation', '/admin/users', '/admin/orders', '/admin/stats', '/admin/security', '/admin/professional-verifications', '/veterinarian-appointments']
for (const [width, locale, theme] of [[320, 'ar', 'dark'], [375, 'fr', 'light'], [768, 'en', 'light'], [1024, 'fr', 'dark'], [1440, 'ar', 'light']]) {
  test(`existing demo pages and navigation ${width}px ${locale} ${theme}`, async ({ page }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width, height: 900 })
    const exceptions = []
    page.on('pageerror', error => exceptions.push(error.message))
    await page.addInitScript(({ locale, theme }) => {
      localStorage.setItem('yazoo-locale', locale)
      localStorage.setItem('yazoo-theme', theme)
      localStorage.setItem('yazoo-onboarding-v1:1', 'done')
      localStorage.setItem('yazoo-cookie-consent', JSON.stringify({ cookies_necessary: true, cookies_analytics: false }))
    }, { locale, theme })
    await mockApi(page, true)
    await page.route('**/api/users/1', route => route.fulfill({ json: { data: { id: 1, name: 'Admin DEMO YaZoo' } } }))
    for (const path of routes) {
      await page.goto(path)
      await expect(page.locator('#main-content')).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), path).toBeLessThanOrEqual(1)
      expect(exceptions, path).toEqual([])
    }
    if (width < 1024) {
      await page.getByRole('button', { name: { ar: 'فتح القائمة', fr: 'Ouvrir le menu', en: 'Open menu' }[locale] }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(await page.getByRole('dialog').getByRole('link').count()).toBeGreaterThan(10)
    } else expect(await page.getByRole('navigation').getByRole('link').count()).toBeGreaterThan(10)
  })
}
