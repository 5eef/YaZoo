import { expect, test } from '@playwright/test'
import { mockApi } from './branding-fixtures'

for (const destination of ['/feed', '/messages', '/veterinarian-appointments']) {
  test(`registration preserves explicit destination ${destination}`, async ({ page }) => {
    await mockApi(page, false)
    await page.route('**/api/auth/register', (route) => route.fulfill({ status: 201, json: { user: { id: 987, name: 'RC fictional user', email: 'rc@example.test', isAdmin: false } } }))
    await page.goto(`/register?returnTo=${encodeURIComponent(destination)}`)
    await page.locator('[name="name"]').fill('RC fictional user')
    await page.locator('[name="email"]').fill('rc@example.test')
    await page.locator('[name="password"]').fill('Fictional-RC-only-2026!')
    await page.locator('[name="password_confirmation"]').fill('Fictional-RC-only-2026!')
    await page.locator('[name="phone"]').fill('0600000000')
    await page.locator('[name="country"]').fill('Maroc')
    await page.locator('[name="city"]').fill('Fès')
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(new RegExp(`${destination}$`))
  })
}

test('localized home switches language and preserves the explicit language through Back', async ({ page }) => {
  await mockApi(page, false)
  await page.goto('/en')
  await page.getByRole('button', { name: 'Arabic', exact: true }).first().click()
  await expect(page).toHaveURL(/\/ar$/)
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.goBack()
  await expect(page).toHaveURL(/\/en$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.locator('a[href="/communities"]').first().click()
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fcommunities$/)
})

test('a restored session on its preferred localized home reaches Feed without a reload loop', async ({ page }) => {
  await mockApi(page, true)
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { user: { id: 987, name: 'RC fictional user', email: 'rc@example.test', preferredLocale: 'en', isAdmin: false } } }))
  let documents = 0
  page.on('request', (request) => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents += 1 })
  await page.goto('/en')
  await expect(page).toHaveURL(/\/feed$/)
  expect(documents).toBe(1)
})
