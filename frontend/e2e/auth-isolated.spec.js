import { expect, test } from '@playwright/test'
import { mockApi } from './branding-fixtures'

for (const locale of ['fr', 'ar', 'en']) {
  test(`mobile login errors, pending state and navigation (${locale})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript((language) => {
      localStorage.setItem('yazoo-locale', language)
      localStorage.setItem('yazoo-cookie-consent', JSON.stringify({ cookies_necessary: true, cookies_analytics: false }))
    }, locale)
    // Every API request is intercepted; no database or hosted backend is used.
    await mockApi(page, false)
    let authenticated = false
    let attempts = 0
    let releaseLogin
    const user = { id: 987, name: 'Isolated User', email: 'isolated@example.test', isAdmin: false }
    await page.route('**/api/auth/me', route => route.fulfill({ status: authenticated ? 200 : 401, json: authenticated ? { user } : { message: 'Unauthenticated.' } }))
    await page.route('**/api/auth/login', async route => {
      attempts += 1
      expect(route.request().postDataJSON()).toMatchObject({ email: user.email, password: 'Isolated-Test-Only!' })
      if (attempts === 1) {
        await route.fulfill({ status: 422, json: { message: 'Invalid isolated credentials' } })
        return
      }
      await new Promise(resolve => { releaseLogin = resolve })
      authenticated = true
      await route.fulfill({ status: 200, json: { user } })
    })
    await page.goto('/login?returnTo=%2Ffeed')
    await page.locator('[name="email"]').fill(user.email)
    await page.locator('[name="password"]').fill('Isolated-Test-Only!')
    const submit = page.locator('button[type="submit"]')
    await expect(submit).toBeEnabled()
    await submit.click()
    await expect(page.getByText('Invalid isolated credentials')).toBeVisible()
    await submit.click()
    await expect(submit).toBeDisabled()
    await expect(page.getByText('Invalid isolated credentials')).toHaveCount(0)
    await expect.poll(() => typeof releaseLogin).toBe('function')
    releaseLogin()
    await expect(page).toHaveURL(/\/feed$/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  })
}
