import { expect, test } from '@playwright/test'
import { mockApi } from './branding-fixtures'

test('login stays visible and disabled during server wake, then becomes usable', async ({ page }) => {
  await mockApi(page, false)
  let healthCalls = 0
  let releaseHealth
  await page.route('**/health/ready', async (route) => {
    healthCalls += 1
    if (healthCalls === 1) {
      await route.fulfill({ status: 503, json: { status: 'waking' } })
      return
    }
    await new Promise(resolve => { releaseHealth = resolve })
    await route.fulfill({ status: 200, json: { status: 'ready' } })
  })
  await page.goto('/login')
  await expect(page.locator('[name="email"]')).toBeVisible()
  const submit = page.locator('button[type="submit"]')
  await expect(submit).toBeDisabled()
  await expect(page.locator('#login-backend-status')).toBeVisible()
  await expect.poll(() => typeof releaseHealth, { timeout: 15000 }).toBe('function')
  releaseHealth()
  await expect(submit).toBeEnabled()
  await expect(page.locator('#login-backend-status')).toHaveCount(0)
  expect(healthCalls).toBeGreaterThanOrEqual(2)
})
