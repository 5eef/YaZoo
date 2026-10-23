import process from 'node:process'
import { expect, test } from '@playwright/test'
const pilot = process.env.E2E_STARTUP_PILOT === 'true'
test.beforeEach(async ({ page }) => {
  await page.route('**/health/ready', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }))
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }))
  await page.route('**/api/legal/config', route => route.fulfill({ contentType: 'application/json', body: '{}' }))
  await page.route('**/api/marketplace/public-preview**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { animals: [], products: [], veterinarians: [], services: [] } }) }))
})
for (const locale of ['fr', 'ar', 'en']) {
  test(`pilot public professional discovery ${locale}`, async ({ page }) => {
    await page.addInitScript(lang => localStorage.setItem('yazoo-locale', lang), locale)
    let filtered = false
    await page.route('**/api/marketplace/public/veterinarians?**', route => {
      const url = new URL(route.request().url())
      filtered = url.searchParams.get('city') === 'Sefrou' && url.searchParams.get('search') === 'Pilot'
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: filtered ? [{ id: 1, type: 'veterinarian', title: 'Pilot Demo Vet', location: 'Sefrou', isDemo: true, createdAt: '2026-10-07' }] : [], meta: { currentPage: 1, lastPage: 1, total: filtered ? 1 : 0, perPage: 12 } }) })
    })
    await page.goto('/discover/veterinarians')
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
    if (pilot) await expect(page.locator('a[href="/discover/animals"]')).toHaveCount(0)
    else await expect(page.locator('a[href="/discover/animals"]')).toHaveCount(1)
    const inputs = page.locator('form input')
    await inputs.nth(0).fill('Pilot')
    await inputs.nth(1).fill('Sefrou')
    await page.locator('form button[type="submit"]').click()
    await expect(page.getByRole('heading', { name: 'Pilot Demo Vet' })).toBeVisible()
    // A long translated demo badge must never collapse the title to zero width.
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 })
      const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Pilot Demo Vet', exact: true }) })
      await expect(card).toHaveCount(1)
      await expect(card.getByRole('heading', { name: 'Pilot Demo Vet', exact: true })).toBeVisible()
      await expect.poll(() => card.locator('h2').evaluate(node => node.getBoundingClientRect().width)).toBeGreaterThan(100)
    }
    expect(filtered).toBe(true)
    await expect(page.locator('body')).not.toHaveText(/undefined|\[object Object\]/)
  })
}
