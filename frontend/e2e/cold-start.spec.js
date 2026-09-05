import { expect, test } from '@playwright/test'

test('le shell React reste visible pendant le reveil puis charge les donnees', async ({ page }) => {
  let healthCalls = 0

  await page.route('**/demo-backend-status', async (route) => {
    healthCalls += 1
    const status = healthCalls >= 3 ? 'ready' : 'waking'

    await route.fulfill({
      status: status === 'ready' ? 200 : 503,
      contentType: 'application/json',
      body: JSON.stringify({ status }),
    })
  })
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Unauthenticated.' }),
  }))
  await page.route('**/api/legal/config', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ smsAvailable: false }),
  }))
  await page.route('**/api/marketplace/public-preview**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        animals: [{
          id: 7,
          type: 'animal',
          title: 'Cold start animal',
          subtitle: 'Demo',
          description: 'Loaded after wake.',
          location: 'Casablanca',
          imageUrl: null,
          author: { name: 'YaZoo', avatar: null },
        }],
        products: [],
        services: [],
        veterinarians: [],
      },
    }),
  }))

  await page.goto('/')

  await expect(page.getByRole('heading', { name: /communauté animalière marocaine|Moroccan animal community/i })).toBeVisible()
  await expect(page.getByText(/Connecting to demo server|Connexion au serveur de démonstration/i)).toBeVisible()
  await expect(page.getByText('Cold start animal')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/Connecting to demo server|Connexion au serveur de démonstration/i)).toHaveCount(0)
  await expect(page.getByText(/Application broken|Server error/i)).toHaveCount(0)
  expect(healthCalls).toBe(3)
})
