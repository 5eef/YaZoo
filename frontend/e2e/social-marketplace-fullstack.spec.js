import { expect as baseExpect, test } from '@playwright/test'
import process from 'node:process'
import { Buffer } from 'node:buffer'
const expect = baseExpect.configure({ timeout: 20000 })
const API = 'http://127.0.0.1:8012/api'
const PASSWORD = 'Social-Isolated-Test-2026!'
let png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2FoAAAAASUVORK5CYII=', 'base64')
const image = { name: 'isolated.png', mimeType: 'image/png', buffer: png }
async function api(page, path, method = 'GET', data, multipart) {
  const cookies = await page.context().cookies(API)
  const csrf = cookies.find(cookie => cookie.name === 'XSRF-TOKEN')
  return page.request.fetch(`${API}${path}`, { method, headers: { Accept: 'application/json', Origin: 'http://127.0.0.1:5182', ...(csrf ? { 'X-XSRF-TOKEN': decodeURIComponent(csrf.value) } : {}) }, ...(multipart ? { multipart } : data ? { data } : {}) })
}
async function configure(context, width) {
  await context.addInitScript(() => {
    if (location.origin === 'null') return
    localStorage.setItem('yazoo-locale', 'fr')
    localStorage.setItem('yazoo-cookie-consent', JSON.stringify({ cookies_necessary: true, cookies_analytics: false }))
  })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  png = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 8
    const paint = canvas.getContext('2d'); paint.fillStyle = '#7c3aed'; paint.fillRect(0, 0, 8, 8)
    return canvas.toDataURL('image/png').split(',')[1]
  }), 'base64')
  image.buffer = png
  await page.setViewportSize({ width, height: 900 })
  return page
}
async function dismiss(page) {
  const skip = page.getByRole('button', { name: /Passer|Plus tard/i }).filter({ visible: true })
  if (await skip.count()) await skip.first().click()
}
async function register(page, tag) {
  const account = { name: `Identity ${tag}`, email: `${tag}@social-e2e.test` }
  await page.goto('/register')
  for (const [name, value] of Object.entries({ ...account, password: PASSWORD, password_confirmation: PASSWORD, city: 'Sefrou' })) await page.locator(`[name="${name}"]`).fill(value)
  const response = page.waitForResponse(r => r.url() === `${API}/auth/register` && r.request().method() === 'POST')
  await page.locator('form button[type="submit"]').click()
  const result = await response
  expect(result.status(), await result.text()).toBe(201)
  account.id = (await result.json()).user.id
  await expect(page).toHaveURL(/\/feed$/)
  await page.evaluate(id => localStorage.setItem(`yazoo-onboarding-v1:${id}`, 'done'), account.id)
  await page.reload()
  return account
}
async function login(page, email) {
  await page.goto('/login?returnTo=%2Fprofile')
  await page.locator('[name="email"]').fill(email)
  await page.locator('[name="password"]').fill(PASSWORD)
  const response = page.waitForResponse(r => r.url() === `${API}/auth/login` && r.request().method() === 'POST')
  await page.locator('form button[type="submit"]').click()
  const loginResponse = await response
  expect(loginResponse.status()).toBe(200)
  const account = (await loginResponse.json()).user
  await page.evaluate(id => localStorage.setItem(`yazoo-onboarding-v1:${id}`, 'done'), account.id)
  await expect(page).toHaveURL(/\/profile$/)
}
async function publish(page, content, media) {
  await page.goto('/feed')
  await dismiss(page)
  await page.getByRole('button', { name: 'Créer un post', exact: true }).click()
  const form = page.locator('form').filter({ has: page.locator('textarea') })
  await form.locator('textarea').fill(content)
  if (media) await form.locator('input[type="file"]').setInputFiles(media)
  const response = page.waitForResponse(r => r.url() === `${API}/posts` && r.request().method() === 'POST')
  await form.locator('button[type="submit"]').click()
  const result = await response
  expect(result.status(), await result.text()).toBe(201)
  return (await result.json()).data
}
async function submitVerification(page, type) {
  await page.goto('/settings/professional-verification')
  const form = page.locator('form').filter({ has: page.locator('input[type="file"]') })
  await form.locator('select').first().selectOption(type)
  if (type === 'veterinarian') {
    await form.getByLabel('Numero licence professionnelle', { exact: true }).fill('ISOLATED-FIXTURE-NOT-A-REAL-LICENSE')
    await form.locator('input[type="date"]').fill('2040-01-01')
  }
  await form.locator('input[type="file"]').setInputFiles(image)
  const sent = page.waitForResponse(r => r.url() === `${API}/professional-verifications` && r.request().method() === 'POST')
  await form.locator('button[type="submit"]').click()
  const response = await sent
  expect(response.status(), await response.text()).toBe(201)
  return (await response.json()).verification
}
async function approveVerification(admin, account, id) {
  await admin.goto('/admin/professional-verifications')
  const card = admin.locator('article').filter({ hasText: account.email }).first()
  await card.getByRole('button', { name: 'Approuvee', exact: true }).click()
  await expect.poll(async () => (await (await api(admin, `/admin/professional-verifications`)).json()).data.find(item => item.id === id)?.status).toBe('approved')
}

test.describe('Social and marketplace with real disposable SQLite and S3 HTTP', () => {
  test.use({ actionTimeout: 15000 })
  test.skip(process.env.E2E_SOCIAL_FULLSTACK !== 'true', 'Dedicated local SQLite/S3Mock required')
  for (const width of [1440, 1024, 768, 375, 320]) {
    test(`identity, persistent profile media, posts, stories, messaging and account isolation ${width}px`, async ({ browser }) => {
      test.setTimeout(240000)
      const ca = await browser.newContext({ baseURL: 'http://127.0.0.1:5182' })
      const cb = await browser.newContext({ baseURL: 'http://127.0.0.1:5182' })
      try {
        const a = await configure(ca, width), b = await configure(cb, width)
        const tag = `run${Date.now()}w${width}`
        const A = await register(a, `${tag}a`), B = await register(b, `${tag}b`)
        await test.step('profile fields, avatar, cover and ownership', async () => {
          console.info(`profile workflow ${width}`)
          await a.goto('/profile')
          await a.getByRole('button', { name: 'Modifier', exact: true }).click()
          await a.getByLabel('Nom', { exact: true }).fill(`Owner ${tag}`)
          await a.getByLabel('Ville', { exact: true }).fill('Rabat')
          await a.locator('form textarea').fill(`Biography ${tag}`)
          const uploads = a.locator('form input[type="file"]')
          await uploads.nth(0).setInputFiles(image); await uploads.nth(1).setInputFiles(image)
          const save = a.waitForResponse(r => r.url() === `${API}/users/${A.id}` && r.request().method() === 'POST')
          await a.locator('form button[type="submit"]').click()
          const response = await save
          expect(response.status(), await response.text()).toBe(200)
          const profile = (await response.json()).data
          expect(profile.name).toBe(`Owner ${tag}`)
          expect(profile.avatar).toContain('/api/media/')
          const avatar = await a.request.get(new URL(profile.avatar, API).href)
          expect(avatar.status()).toBe(200)
          expect((await avatar.body()).equals(png)).toBe(true)
          await a.reload()
          await expect(a.getByRole('heading', { name: `Owner ${tag}`, exact: true })).toBeVisible()
          expect((await api(b, `/users/${A.id}`, 'PATCH', { name: 'Forbidden identity change' })).status()).toBe(403)
          await b.goto(`/profile/${A.id}`)
          await expect(b.getByRole('heading', { name: `Owner ${tag}`, exact: true })).toBeVisible()
          await expect(b.getByRole('button', { name: 'Modifier', exact: true })).toHaveCount(0)
        })
        await test.step('post image, cross-account comment, like and persisted reply', async () => {
          console.info(`post workflow ${width}`)
          const post = await publish(a, `Publication ${tag}`, image)
          await b.goto('/feed')
          const card = b.getByTestId('feed-main-column').locator('article').filter({ hasText: `Publication ${tag}` }).first()
          await expect(card).toBeVisible()
          await card.getByRole('button', { name: 'Commentaires', exact: true }).click()
          await card.locator('textarea').fill(`Comment from B ${tag}`)
          const commentResponse = b.waitForResponse(r => r.url() === `${API}/posts/${post.id}/comments` && r.request().method() === 'POST')
          await card.locator('form button[type="submit"]').click()
          expect((await commentResponse).status()).toBe(201)
          await a.goto('/feed')
          const ownCard = a.getByTestId('feed-main-column').locator('article').filter({ hasText: `Publication ${tag}` }).first()
          await expect(ownCard).toBeVisible()
          const showComments = ownCard.getByRole('button', { name: 'Commentaires', exact: true })
          if (await showComments.count()) await showComments.click()
          await expect(ownCard.getByText(`Comment from B ${tag}`, { exact: true })).toBeVisible()
          expect((await api(b, `/posts/${post.id}`, 'PATCH', { content: 'Forbidden' })).status()).toBe(403)
          expect((await api(b, `/posts/${post.id}/like`, 'POST', { reaction: 'like' })).status()).toBe(200)
          await a.reload()
          expect((await api(a, '/posts')).status()).toBe(200)
          const secret = await api(a, '/posts', 'POST', { content: `Private ${tag}`, visibility: 'private' })
          expect(secret.status()).toBe(201)
          const secretId = (await secret.json()).data.id
          expect((await api(b, `/media/posts/${secretId}`)).status()).toBe(404)
          expect((await (await api(b, '/posts')).json()).data.some(p => p.id === secretId)).toBe(false)
        })
        await test.step('story appears through polling, view recorded without full reload', async () => {
          console.info(`story workflow ${width}`)
          await b.goto('/feed')
          const storiesBefore = await (await api(b, '/stories')).json()
          expect(storiesBefore.data.some(group => group.user.id === A.id)).toBe(false)
          await a.goto('/feed')
          await a.getByRole('button', { name: 'Partager', exact: true }).first().click()
          const storyForm = a.getByRole('dialog')
          await storyForm.locator('textarea').fill(`Story ${tag}`)
          await storyForm.locator('input[type="file"]').setInputFiles(image)
          const createdStory = a.waitForResponse(r => r.url() === `${API}/stories` && r.request().method() === 'POST')
          await storyForm.locator('button[type="submit"]').click()
          const response = await createdStory
          expect(response.status(), await response.text()).toBe(201)
          const story = (await response.json()).data
          const storyCard = b.getByTestId(`story-group-${A.id}`).getByRole('button').first()
          await expect(storyCard).toBeVisible({ timeout: 45000 })
          const viewed = b.waitForResponse(r => r.url() === `${API}/stories/${story.id}/view` && r.request().method() === 'POST')
          await storyCard.click()
          expect((await viewed).status()).toBe(200)
          const ownerStories = (await (await api(a, '/stories')).json()).data
          expect(ownerStories.find(g => g.user.id === A.id).stories.find(s => s.id === story.id).viewsCount).toBe(1)
          expect((await api(b, `/stories/${story.id}`, 'DELETE')).status()).toBe(403)
        })
        await test.step('two-account messaging, unread count and persisted reception', async () => {
          await a.goto(`/messages?user=${B.id}`)
          const composer = a.getByPlaceholder(/message/i).last()
          await composer.fill(`Message ${tag}`)
          const sent = a.waitForResponse(r => /\/conversations\/\d+\/messages$/.test(r.url()) && r.request().method() === 'POST')
          await a.getByRole('button', { name: 'Envoyer', exact: true }).click()
          expect((await sent).status()).toBe(201)
          const unread = await (await api(b, '/messages/unread-count')).json()
          expect(unread.data.unreadCount ?? unread.data.unread_count).toBeGreaterThan(0)
          await b.goto('/messages')
          await b.getByRole('button', { name: new RegExp(`Owner ${tag}`) }).click()
          await expect(b.getByText(`Message ${tag}`, { exact: true }).last()).toBeVisible()
          await b.reload()
          await expect(b.getByText(`Message ${tag}`, { exact: true }).last()).toBeVisible()
        })
        await test.step('logout, server 401, account switch and no private rollback', async () => {
          await a.goto('/settings')
          const logout = a.waitForResponse(r => r.url() === `${API}/auth/logout` && r.request().method() === 'POST')
          await a.locator('#main-content').getByRole('button', { name: 'Se déconnecter', exact: true }).click()
          expect((await logout).status()).toBe(200)
          await expect(a).toHaveURL(/\/login$/)
          expect((await api(a, '/auth/me')).status()).toBe(401)
          await login(a, B.email)
          await expect(a.getByRole('heading', { name: B.name, exact: true })).toBeVisible()
          await expect(a.getByRole('heading', { name: `Owner ${tag}`, exact: true })).toHaveCount(0)
        })
      } finally { await ca.close(); await cb.close() }
    })
    test(`community membership, professional review, service booking and veterinarian appointment ${width}px`, async ({ browser }) => {
      test.setTimeout(240000)
      const contexts = await Promise.all([1,2,3,4].map(() => browser.newContext({ baseURL: 'http://127.0.0.1:5182' })))
      try {
        const [a,b,p,c] = await Promise.all(contexts.map(context => configure(context, width)))
        const tag = `business${Date.now()}w${width}`
        const A = await register(a, `${tag}a`), B = await register(b, `${tag}b`), P = await register(p, `${tag}p`)
        await login(c, 'admin@social-e2e.test')
        await test.step('private community membership and community publication', async () => {
          console.info(`community workflow ${width}`)
          await a.goto('/communities')
          await a.getByRole('button', { name: 'Creer une communaute', exact: true }).first().click()
          const form = a.locator('form').filter({ has: a.locator('textarea') })
          await form.getByLabel('Nom', { exact: true }).fill(`Group ${tag}`)
          await form.locator('textarea').fill(`Private community ${tag}`)
          await form.locator('input[type="checkbox"]').check()
          await form.locator('input[type="file"]').setInputFiles(image)
          const create = a.waitForResponse(r => r.url() === `${API}/communities` && r.request().method() === 'POST')
          await form.locator('button[type="submit"]').click()
          const response = await create
          expect(response.status(), await response.text()).toBe(201)
          const community = (await response.json()).data
          expect((await api(b, '/posts', 'POST', { community_id: community.id, content: 'Unapproved member' })).status()).toBe(403)
          await b.goto(`/communities/${community.id}`)
          const request = b.waitForResponse(r => r.url() === `${API}/communities/${community.id}/join` && r.request().method() === 'POST')
          await b.getByRole('button', { name: /Demander/ }).first().click()
          expect((await request).ok()).toBe(true)
          await a.reload()
          const card = a.locator('article').filter({ hasText: `Group ${tag}` })
          await card.getByRole('button', { name: 'Gerer les demandes', exact: true }).click()
          const approve = a.waitForResponse(r => /membership-requests\/\d+\/approve$/.test(r.url()) && r.request().method() === 'POST')
          await card.getByRole('button', { name: 'Approuver', exact: true }).click()
          expect((await approve).ok()).toBe(true)
          await b.goto(`/communities/${community.id}`)
          await b.getByRole('button', { name: 'Créer un post', exact: true }).click()
          const postForm = b.locator('form').filter({ has: b.locator('textarea') })
          await postForm.locator('textarea').fill(`Community post ${tag}`)
          const posted = b.waitForResponse(r => r.url() === `${API}/posts` && r.request().method() === 'POST')
          await postForm.locator('button[type="submit"]').click()
          expect((await posted).status()).toBe(201)
          await a.goto(`/communities/${community.id}`)
          await expect(a.getByText(`Community post ${tag}`, { exact: true })).toBeVisible()
          expect((await api(p, '/posts?community_id='+community.id)).status()).toBe(403)
        })
        await test.step('professional review, private document and genuine backend badge', async () => {
          console.info(`verification workflow ${width}`)
          expect((await (await api(b, `/users/${B.id}`)).json()).data.isProfessionalVerified).toBe(false)
          const verification = await submitVerification(b, 'veterinarian')
          expect(verification.status).toBe('pending')
          expect((await api(a, `/professional-verifications/${verification.id}/document`)).status()).toBe(403)
          await approveVerification(c, B, verification.id)
          await b.goto('/profile')
          await expect(b.getByText('Documents professionnels verifies par YaZoo', { exact: true })).toBeVisible()
          expect((await (await api(b, `/users/${B.id}`)).json()).data.isProfessionalVerified).toBe(true)
          // Backend capabilities intentionally separate a veterinarian from a service provider.
          expect((await api(b, '/services', 'POST', { type: 'pet_sitting', title: 'Wrong professional scope', description: 'Isolated scope test', contact_visibility: 'messages_only' })).status()).toBe(403)
          const serviceVerification = await submitVerification(p, 'service_provider')
          await approveVerification(c, P, serviceVerification.id)
        })
        await test.step('service publication, moderation, favorite and reservation', async () => {
          console.info(`service workflow ${width}`)
          await p.goto('/marketplace/services?create=1')
          const form = p.locator('form').filter({ has: p.locator('textarea') })
          await form.locator('input').first().fill(`Service ${tag}`)
          await form.locator('textarea').fill(`Service description ${tag}`)
          await form.locator('input[type="number"]').fill('100')
          const sent = p.waitForResponse(r => r.url() === `${API}/services` && r.request().method() === 'POST')
          await form.locator('button[type="submit"]').click()
          const response = await sent
          expect(response.status(), await response.text()).toBe(201)
          const service = (await response.json()).data
          expect((await api(a, `/services/${service.id}`)).status()).toBe(404)
          expect((await api(c, `/admin/content/service/${service.id}/moderation-status`, 'PATCH', { action: 'approve' })).status()).toBe(200)
          await a.goto('/marketplace/services')
          const card = a.locator('article').filter({ hasText: `Service ${tag}` }).last()
          await expect(card).toBeVisible()
          const reserved = a.waitForResponse(r => r.url() === `${API}/reservations` && r.request().method() === 'POST')
          await card.getByRole('button', { name: /Reserver|Réserver/ }).click()
          const bookingResponse = await reserved
          expect(bookingResponse.status(), await bookingResponse.text()).toBe(201)
          await a.goto('/reservations')
          await expect(a.getByText(`Service ${tag}`, { exact: true }).first()).toBeVisible()
          await a.reload()
          await expect(a.getByText(`Service ${tag}`, { exact: true }).first()).toBeVisible()
        })
        await test.step('veterinarian publication, availability, booking and confirmation', async () => {
          console.info(`veterinarian workflow ${width}`)
          await b.goto('/marketplace/veterinarians?create=1')
          const form = b.locator('form').filter({ has: b.locator('textarea') })
          await form.getByLabel('Nom', { exact: true }).fill(`Veterinarian ${tag}`)
          await form.locator('textarea').first().fill(`Veterinarian profile ${tag}`)
          await form.locator('input[type="file"]').setInputFiles(image)
          const created = b.waitForResponse(r => r.url() === `${API}/veterinarians` && r.request().method() === 'POST')
          await form.locator('button[type="submit"]').click()
          const response = await created
          expect(response.status(), await response.text()).toBe(201)
          const vet = (await response.json()).data
          expect((await api(c, `/admin/content/veterinarian/${vet.id}/moderation-status`, 'PATCH', { action: 'approve' })).status()).toBe(200)
          await b.goto(`/veterinarian-appointments?veterinarian=${vet.id}&owner=1`)
          const start = new Date(Date.now()+86400000).toISOString().slice(0,10)+'T10:00'
          const end = start.replace('10:00','10:30')
          await b.locator('input[type="datetime-local"]').nth(0).fill(start)
          await b.locator('input[type="datetime-local"]').nth(1).fill(end)
          const saved = b.waitForResponse(r => r.url() === `${API}/veterinarians/${vet.id}/availability` && r.request().method() === 'POST')
          await b.locator('form button[type="submit"]').click()
          expect((await saved).status()).toBe(201)
          await a.goto(`/veterinarian-appointments?veterinarian=${vet.id}`)
          await a.getByRole('combobox').first().selectOption({ index: 1 })
          await a.getByLabel(/Type d.animal/).fill('Chat')
          await a.getByLabel('Motif', { exact: true }).fill(`Appointment ${tag}`)
          const booked = a.waitForResponse(r => r.url() === `${API}/veterinarians/${vet.id}/appointments` && r.request().method() === 'POST')
          await a.locator('form button[type="submit"]').click()
          expect((await booked).ok()).toBe(true)
          await b.goto('/veterinarian-appointments')
          const appointment = b.locator('article').filter({ hasText: `Appointment ${tag}` })
          const confirmed = b.waitForResponse(r => /veterinarian-appointments\/\d+\/status$/.test(r.url()) && r.request().method() === 'PATCH')
          await appointment.getByRole('button', { name: 'Confirmer', exact: true }).click()
          expect((await confirmed).ok()).toBe(true)
          await a.reload()
          await expect(a.locator('article').filter({ hasText: `Appointment ${tag}` }).getByText('Confirmé', { exact: true })).toBeVisible()
        })
      } finally { await Promise.all(contexts.map(context => context.close())) }
    })
  }
})

for (const width of [1440, 320]) test(`animal and product owner lifecycle with administrative review ${width}px`, async ({ browser }) => {
  test.skip(process.env.E2E_SOCIAL_FULLSTACK !== 'true', 'Disposable fixture only')
  test.setTimeout(180000)
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext({ baseURL: 'http://127.0.0.1:5182' })))
  try {
    const [owner, buyer, admin] = await Promise.all(contexts.map(context => configure(context, width)))
    const tag = `catalog${Date.now()}w${width}`
    const account = await register(owner, tag)
    await register(buyer, `${tag}buyer`)
    await login(admin, 'admin@social-e2e.test')
    for (const [kind, role] of [['products', 'seller'], ['animals', 'breeder']]) {
      const verification = await submitVerification(owner, role)
      await approveVerification(admin, account, verification.id)
      await owner.goto(`/marketplace/${kind}?create=1`)
      const form = owner.locator('form').filter({ has: owner.locator('textarea') })
      const name = `Isolated ${kind} ${tag}`
      await form.getByLabel('Nom', { exact: true }).fill(name)
      await form.locator('textarea').fill(`Explicitly isolated listing ${tag}`)
      // Text fields are rendered in a fixed existing form order: name, location for products;
      // name, type, breed, location for animals.
      if (kind === 'products') {
        await form.locator('input[type="number"]').first().fill('25')
        await form.locator('input:not([type]), input[type="text"]').nth(1).fill('Rabat')
      } else {
        await form.getByLabel('Type', { exact: true }).fill('Chat')
        await form.locator('input:not([type]), input[type="text"]').nth(3).fill('Rabat')
        await form.locator('select').first().selectOption('cat')
        await form.locator('input[type="checkbox"]').last().check()
      }
      await form.locator('input[type="file"]').first().setInputFiles(image)
      const published = owner.waitForResponse(response => response.url() === `${API}/${kind}` && response.request().method() === 'POST')
      await form.locator('button[type="submit"]').click()
      const response = await published
      expect(response.status(), await response.text()).toBe(201)
      const listing = (await response.json()).data
      expect((await api(buyer, `/${kind}/${listing.id}`)).status()).toBe(404)
      expect((await api(buyer, `/${kind}/${listing.id}`, 'PUT', { name: 'Forbidden edit' })).status()).toBe(403)
      expect((await api(admin, `/admin/content/${kind === 'animals' ? 'animal' : 'product'}/${listing.id}/moderation-status`, 'PATCH', { action: 'approve' })).status()).toBe(200)
      if (kind === 'animals') expect((await api(admin, `/admin/animals/${listing.id}/legal-status`, 'PATCH', { legal_status: 'approved', moderation_note: 'Isolated application moderation test, no official certification.' })).status()).toBe(200)
      await buyer.goto(`/marketplace/${kind}/${listing.id}`)
      await expect(buyer.getByRole('heading', { name, exact: true }).first()).toBeVisible()
      await owner.goto(`/marketplace/${kind}?q=${encodeURIComponent(name)}`)
      const card = owner.locator('article').filter({ hasText: name }).first()
      await card.getByRole('button', { name: 'Modifier', exact: true }).click()
      const edit = owner.locator('form').filter({ has: owner.locator('textarea') })
      await edit.getByLabel('Nom', { exact: true }).fill(`Edited ${name}`)
      const updated = owner.waitForResponse(result => result.url() === `${API}/${kind}/${listing.id}` && ['POST', 'PUT'].includes(result.request().method()))
      await edit.locator('button[type="submit"]').click()
      expect((await updated).status()).toBe(200)
      expect((await (await api(owner, `/${kind}/${listing.id}`)).json()).data.name).toBe(`Edited ${name}`)
      await owner.goto(`/marketplace/${kind}?q=${encodeURIComponent(`Edited ${name}`)}`)
      const ownCard = owner.locator('article').filter({ hasText: `Edited ${name}` }).first()
      owner.once('dialog', dialog => dialog.accept())
      const removed = owner.waitForResponse(result => result.url() === `${API}/${kind}/${listing.id}` && result.request().method() === 'DELETE')
      await ownCard.getByRole('button', { name: 'Supprimer', exact: true }).click()
      expect((await removed).status()).toBe(200)
      expect((await api(owner, `/${kind}/${listing.id}`)).status()).toBe(404)
    }
  } finally { await Promise.all(contexts.map(context => context.close())) }
})
