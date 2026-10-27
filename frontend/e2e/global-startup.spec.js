import { expect, test } from '@playwright/test'

for (const locale of ['fr', 'en', 'ar']) {
  for (const theme of ['light', 'dark']) {
    test(`global landing ${locale} ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.addInitScript((value) => {
        localStorage.setItem('yazoo-locale', 'en') // URL must override a different saved locale.
        localStorage.setItem('yazoo-theme', value)
      }, theme)
      await page.route('**/health/ready', (route) => route.fulfill({ json: { status: 'ready' } }))
      await page.route((url) => url.pathname.startsWith('/api/'), (route) => route.fulfill({ status: 401, json: {} }))
      await page.goto(`/${locale}`)
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('link[hreflang]')).toHaveCount(3)
      await expect(page.locator('a[href="/register?returnTo=%2Ffeed"]').first()).toBeVisible()
      let navigations = 0
      page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations += 1 })
      await page.locator('button[aria-pressed="true"]').first().click()
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      expect(navigations).toBe(0)
      for (const width of [320, 375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        await expect(page.locator('h1')).toBeVisible()
      }
      await page.setViewportSize({ width: 390, height: 900 })
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toBeVisible()
    })
  }
}
