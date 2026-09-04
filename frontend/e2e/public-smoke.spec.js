import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies()
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
})

async function mockGuestApi(page) {
  await page.route('**/sanctum/csrf-cookie', async (route) => {
    await route.fulfill({ status: 204 })
  })

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unauthenticated.' }),
    })
  })

  await page.route('**/api/legal/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        entityName: 'YaZoo',
        legalStatus: 'Projet communautaire',
        address: 'Casablanca, Maroc',
        privacyContactEmail: 'privacy@example.test',
        dataControllerName: 'YaZoo',
        dataRetentionDays: 365,
        dataRequestResponseDays: 30,
        contactEmail: 'contact@example.test',
        contactAvailable: true,
        smsAvailable: false,
      }),
    })
  })

  await page.route('**/api/marketplace/public-preview**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          animals: [
            {
              id: 1,
              type: 'animal',
              title: 'Chat à adopter',
              subtitle: 'Chat · Européen',
              description: 'Annonce publique de démonstration.',
              location: 'Casablanca',
              price: null,
              imageUrl: null,
              badge: 'adoption',
              createdAt: '2026-07-24T10:00:00Z',
              author: { name: 'Association YaZoo', avatar: null },
            },
          ],
          products: [],
          services: [],
          veterinarians: [],
        },
      }),
    })
  })

  await page.route('**/api/marketplace/public/animals?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [publicAnimalListing()],
        meta: {
          currentPage: 1,
          lastPage: 1,
          perPage: 12,
          total: 1,
        },
      }),
    })
  })

  await page.route('**/api/marketplace/public/animals/1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: publicAnimalListing(),
      }),
    })
  })

  await page.route('**/api/marketplace/public/animals/999', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Not found.' }),
    })
  })
}

function publicAnimalListing() {
  return {
    id: 1,
    type: 'animal',
    title: 'Chat public a adopter',
    subtitle: 'Chat - Europeen',
    description: 'Annonce publique validee sans coordonnees privees.',
    location: 'Casablanca',
    price: null,
    imageUrl: null,
    badge: 'adoption',
    professionalBadge: null,
    createdAt: '2026-07-24T10:00:00Z',
    author: { name: 'Association YaZoo', avatar: null },
  }
}

test('landing page locale charge sans compte reel', async ({ page }) => {
  await mockGuestApi(page)

  await page.goto('/')

  await expect(page.getByRole('heading', { name: /Moroccan animal community/i })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Log in' }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /Latest YaZoo Marketplace listings/i })).toBeVisible()
  await expect(page.getByText('Chat à adopter')).toBeVisible()

  await page.getByRole('link', { name: 'View details', exact: true }).click()
  await expect(page).toHaveURL(/\/discover\/animals\/1$/)
  await expect(page.getByRole('heading', { name: 'Chat public a adopter' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in to contact' })).toBeVisible()
})

test('aperçu public reste responsive sans débordement et supporte sombre et RTL', async ({
  page,
}) => {
  await mockGuestApi(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    window.localStorage.setItem('yazoo-theme', 'dark')
    window.localStorage.setItem('yazoo-locale', 'ar')
  })

  const consoleErrors = []
  const unexpectedHttpErrors = []
  const failedRequests = []
  const expectedGuestAuth401Urls = new Set()

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push({
        text: message.text(),
        url: message.location().url,
      })
    }
  })
  page.on('response', (response) => {
    if (response.status() < 400) {
      return
    }

    const responsePath = getUrlPathname(response.url())
    const isExpectedGuestAuthProbe =
      response.status() === 401 && responsePath === '/api/auth/me'

    if (isExpectedGuestAuthProbe) {
      expectedGuestAuth401Urls.add(response.url())
      return
    }

    unexpectedHttpErrors.push(`${response.status()} ${response.url()}`)
  })
  page.on('requestfailed', (request) => {
    failedRequests.push(
      `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`.trim(),
    )
  })

  await page.goto('/')

  await expect(page.getByRole('heading', { name: /أحدث إعلانات سوق YaZoo/i })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveClass(/dark/)

  const hasGlobalHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  const unexpectedConsoleErrors = consoleErrors.filter(
    (consoleError) =>
      !isExpectedGuestAuthConsoleError(consoleError, expectedGuestAuth401Urls),
  )

  expect(hasGlobalHorizontalOverflow).toBe(false)
  expect(unexpectedConsoleErrors).toEqual([])
  expect(unexpectedHttpErrors).toEqual([])
  expect(failedRequests).toEqual([])
})

test('seul le message console du 401 exact de auth me est attendu', () => {
  const expectedUrls = new Set(['http://localhost:4173/api/auth/me'])

  expect(
    isExpectedGuestAuthConsoleError(
      {
        text: 'Failed to load resource: the server responded with a status of 401',
        url: 'http://localhost:4173/api/auth/me',
      },
      expectedUrls,
    ),
  ).toBe(true)
  expect(
    isExpectedGuestAuthConsoleError(
      {
        text: 'Failed to load resource: the server responded with a status of 403',
        url: 'http://localhost:4173/api/auth/me',
      },
      expectedUrls,
    ),
  ).toBe(false)
  expect(
    isExpectedGuestAuthConsoleError(
      {
        text: 'Failed to load resource: the server responded with a status of 401',
        url: 'http://localhost:4173/api/private',
      },
      expectedUrls,
    ),
  ).toBe(false)
  expect(
    isExpectedGuestAuthConsoleError(
      {
        text: 'Failed to load resource: the server responded with a status of 401',
        url: '',
      },
      expectedUrls,
    ),
  ).toBe(false)
})

test('page confiance et securite reste publique', async ({ page }) => {
  await mockGuestApi(page)

  await page.goto('/trust')

  await expect(page).toHaveURL(/\/trust$/)
  await expect(page.getByRole('heading', { name: /Clearer exchanges/i })).toBeVisible()
})

test('login affiche le formulaire sans secret reel', async ({ page }) => {
  await mockGuestApi(page)

  await page.goto('/login')

  await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Password/i })).toBeVisible()
})

test('marketplace protege redirige vers login si invite', async ({ page }) => {
  await mockGuestApi(page)

  await page.goto('/marketplace')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()
})

test('catalogue public animaux reste consultable sans connexion', async ({ page }) => {
  await mockGuestApi(page)
  await page.addInitScript(() => {
    window.localStorage.setItem('yazoo-locale', 'fr')
  })

  await page.goto('/discover/animals')

  await expect(
    page.getByRole('heading', { name: /Animaux à adopter ou disponibles au Maroc/i }),
  ).toBeVisible()
  await expect(page.getByText('Chat public a adopter')).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /index, follow/,
  )
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    new URL('/discover/animals', page.url()).href,
  )

  await page.getByRole('link', { name: /Voir les détails: Chat public/i }).click()

  await expect(page).toHaveURL(/\/discover\/animals\/1$/)
  await expect(page.getByRole('heading', { name: 'Chat public a adopter' })).toBeVisible()
  await expect(page.getByText('+212', { exact: false })).toHaveCount(0)
  await expect(page.locator('#yazoo-listing-structured-data')).toHaveCount(1)
})

test('fiche publique absente devient non indexable', async ({ page }) => {
  await mockGuestApi(page)
  await page.addInitScript(() => {
    window.localStorage.setItem('yazoo-locale', 'fr')
  })

  await page.goto('/discover/animals/999')

  await expect(page.getByRole('heading', { name: 'Annonce introuvable' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow',
  )
  await expect(page.locator('#yazoo-listing-structured-data')).toHaveCount(0)
})

test('metadonnees SEO indexent uniquement les routes publiques', async ({ page }) => {
  await mockGuestApi(page)
  await page.addInitScript(() => {
    window.localStorage.setItem('yazoo-locale', 'fr')
  })

  await page.goto('/about')

  await expect(page).toHaveTitle('A propos de YaZoo | YaZoo')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    new URL('/about', page.url()).href,
  )
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /index, follow/,
  )
  await expect(page.locator('#yazoo-structured-data')).toHaveCount(0)

  await page.goto('/')

  await expect(page.locator('#yazoo-structured-data')).toHaveCount(1)

  await page.goto('/login')

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow',
  )
})

function isExpectedGuestAuthConsoleError(consoleError, expectedUrls) {
  return (
    consoleError.text.startsWith('Failed to load resource:') &&
    /\b401\b/.test(consoleError.text) &&
    getUrlPathname(consoleError.url) === '/api/auth/me' &&
    expectedUrls.has(consoleError.url)
  )
}

function getUrlPathname(value) {
  try {
    return new URL(value).pathname
  } catch {
    return null
  }
}
