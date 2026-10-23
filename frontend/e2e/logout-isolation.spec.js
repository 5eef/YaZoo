import { expect, test } from '@playwright/test'
import { mockApi } from './branding-fixtures'

async function setup(page, { failure = 0, cookieSurvives = false } = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('yazoo-locale', 'fr')
    localStorage.setItem('yazoo-cookie-consent', JSON.stringify({ cookies_necessary: true, cookies_analytics: false }))
  })
  await mockApi(page, false)
  let current = { id: 901, name: 'Client Isolated A', email: 'a@example.test', isAdmin: false }
  let calls = 0
  await page.route('**/api/auth/me', route => route.fulfill({ status: current ? 200 : 401, json: current ? { user: current } : { message: 'Unauthenticated.' } }))
  await page.route('**/api/users/*', route => route.fulfill({ json: { data: current } }))
  await page.route('**/api/auth/logout', async route => {
    calls++
    if (!failure && !cookieSurvives) current = null
    await route.fulfill({ status: failure || 200, json: { message: failure ? 'Isolated logout unavailable' : 'Signed out' } })
  })
  await page.route('**/api/auth/login', async route => {
    const email = route.request().postDataJSON().email
    current = { id: email.startsWith('b') ? 902 : 901, name: email.startsWith('b') ? 'Veterinarian Isolated B' : 'Client Isolated A', email, isAdmin: false }
    await route.fulfill({ json: { user: current } })
  })
  return { calls: () => calls }
}
async function signOut(page, width) {
  if (width < 1024) await page.getByRole('button', { name: /ouvrir.*menu/i }).click()
  const area = width < 1024 ? page.getByRole('dialog', { name: 'Menu principal' }) : page.getByRole('banner')
  await area.getByRole('button', { name: 'Se déconnecter', exact: true }).click()
}
for (const width of [320, 375, 768, 1024, 1440]) {
  for (const path of ['/profile', '/profile/901', '/feed', '/settings']) {
    test(`logout ${path} at ${width}px, back and reload stay public`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const state = await setup(page)
      await page.goto('/messages')
      await page.goto(path)
      await signOut(page, width)
      await expect(page).toHaveURL(/\/login/)
      await expect.poll(state.calls).toBe(1)
      await page.goBack()
      await expect(page).toHaveURL(/\/login/)
      await page.goForward()
      await expect(page).toHaveURL(/\/login/)
      await page.reload()
      await expect(page).toHaveURL(/\/login/)
      await expect(page.getByText('Client Isolated A', { exact: true })).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    })
  }
}
for (const options of [{ failure: 419 }, { failure: 429 }, { failure: 503 }, { cookieSurvives: true }]) {
  test(`logout failure stays locked: ${JSON.stringify(options)}`, async ({ page }) => {
    const state = await setup(page, options)
    await page.goto('/profile')
    await signOut(page, 1440)
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText(/déconnexion du serveur n’a pas pu être vérifiée/)).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL(/\/login/)
    expect(state.calls()).toBe(1)
    await expect(page.getByText('Client Isolated A', { exact: true })).toHaveCount(0)
  })
}
test('client -> veterinarian -> client uses only the new profile', async ({ page }) => {
  await setup(page)
  await page.goto('/profile')
  for (const [email, name] of [['b@example.test', 'Veterinarian Isolated B'], ['a@example.test', 'Client Isolated A']]) {
    await signOut(page, 1440)
    await expect(page).toHaveURL(/\/login/)
    await page.locator('[name="email"]').fill(email)
    await page.locator('[name="password"]').fill('Isolated-Test-Only!')
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/feed$/)
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  }
  await signOut(page, 1440)
  await page.reload()
  await expect(page).toHaveURL(/\/login/)
})
