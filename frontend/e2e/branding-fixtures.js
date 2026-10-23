export async function mockApi(page, authenticated) {
  await page.route('**/health/ready', async (route) => json(route, { status: 'ready' }))
  await page.route('**/sanctum/csrf-cookie', async (route) => route.fulfill({ status: 204 }))
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())

    if (!url.pathname.startsWith('/api/')) {
      return route.fallback()
    }

    const path = url.pathname.replace(/^\/api/, '')

    if (path === '/auth/me') {
      return json(route, authenticated ? { user: userFixture } : { message: 'Unauthenticated.' }, authenticated ? 200 : 401)
    }

    if (path === '/posts') return json(route, { data: [], meta: {} })
    if (path === '/stories') return json(route, { data: [] })
    if (path === '/animals') return json(route, { data: [animalFixture], meta: {} })
    if (path === '/animals/1') return json(route, { data: animalFixture })
    if (path === '/products') return json(route, { data: [productFixture], meta: {} })
    if (path === '/products/1') return json(route, { data: productFixture })
    if (path === '/services' || path === '/services/feed') return json(route, { data: [], meta: {} })
    if (path === '/services/types') return json(route, { data: ['pet_sitting', 'training'] })
    if (path === '/veterinarians') return json(route, { data: [], meta: {} })
    if (path === '/communities') return json(route, { data: [communityFixture], meta: {} })
    if (path === '/communities/1') return json(route, { data: communityFixture })
    if (path === '/conversations') return json(route, { data: [] })
    if (path === '/messages/unread-count') {
      return json(route, { data: { unreadCount: 0, unread_count: 0 } })
    }
    if (path === '/notifications') return json(route, { data: [] })
    if (path === '/notifications/unread-count') {
      return json(route, { data: { unreadCount: 0 } })
    }
    if (path === '/reservations') return json(route, { buyerReservations: [], sellerReservations: [], meta: {} })
    if (path === '/orders/history') return json(route, { buyerHistory: [], sellerHistory: [], meta: {} })
    if (path === '/privacy/consents') return json(route, { data: [] })
    if (path === '/privacy/delete-request') return json(route, { data: null })
    if (path.startsWith('/admin/')) return json(route, adminFixture(path))

    return json(route, { data: [] })
  })
}

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

function adminFixture(path) {
  if (path === '/admin/stats') return { users: 1, posts: 0, reports: 0, pendingVerifications: 0 }
  if (path === '/admin/orders') return { stats: {}, pending: [], approved: [], completed: [], cancelled: [] }
  return { data: [], stats: {}, reports: [], moderationActions: [] }
}

const userFixture = {
  id: 1,
  name: 'Admin DEMO YaZoo',
  email: 'admin@yazoo.test',
  isAdmin: true,
  marketplacePublishing: {
    canPublish: true,
    businessType: 'trainer',
    verificationStatus: 'approved',
    destination: 'services',
    serviceType: 'training',
  },
}

const animalFixture = {
  id: 1,
  name: 'Luna',
  type: 'Chien',
  location: 'Rabat',
  price: 100,
  author: userFixture,
  image: null,
  user: userFixture,
}

const productFixture = {
  id: 1,
  name: 'Panier',
  price: 240,
  location: 'Marrakech',
  image: null,
  author: userFixture,
  user: userFixture,
}

const communityFixture = {
  id: 1,
  name: 'Amis des animaux',
  description: 'Communauté de test',
  isPrivate: false,
  owner: userFixture,
  membersCount: 1,
  userRole: 'admin',
}
