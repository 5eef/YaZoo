import { test, expect } from '@playwright/test'
import process from 'node:process'

const origin = 'http://127.0.0.1:8012'
test.skip(process.env.E2E_SOCIAL_FULLSTACK !== 'true', 'Disposable SQLite only')
for (const width of [1440, 320]) test(`persistent notifications, HTTP polling and recipient isolation ${width}px`, async ({ browser }) => {
  test.setTimeout(90000)
  const contexts = await Promise.all([0, 1].map(() => browser.newContext({ viewport: { width, height: 900 } })))
  try {
    async function call(context, path, method = 'GET', data) {
      const csrf = (await context.cookies(origin)).find(cookie => cookie.name === 'XSRF-TOKEN')
      return context.request.fetch(`${origin}/api${path}`, { method, headers: { Accept: 'application/json', Origin: 'http://127.0.0.1:5182', ...(csrf ? { 'X-XSRF-TOKEN': decodeURIComponent(csrf.value) } : {}) }, ...(data ? { data } : {}) })
    }
    const users = []
    for (const [index, context] of contexts.entries()) {
      await context.request.get(`${origin}/sanctum/csrf-cookie`)
      const created = await call(context, '/auth/register', 'POST', { name: `Notification actor ${index}`, email: `notice${Date.now()}w${width}i${index}@social-e2e.test`, city: 'Sefrou', password: 'Social-Isolated-Test-2026!', password_confirmation: 'Social-Isolated-Test-2026!' })
      expect(created.status()).toBe(201)
      users.push((await created.json()).user)
      await context.addInitScript(id => { if (location.origin === 'null') return; localStorage.setItem('yazoo-locale', 'fr'); localStorage.setItem(`yazoo-onboarding-v1:${id}`, 'done') }, users[index].id)
    }
    const page = await contexts[0].newPage()
    await page.clock.install()
    const initial = page.waitForResponse(response => response.url() === `${origin}/api/notifications`)
    await page.goto('http://127.0.0.1:5182/notifications'); await initial
    expect((await call(contexts[1], `/users/${users[0].id}/follow`, 'POST')).status()).toBe(200)
    const notifications = (await (await call(contexts[0], '/notifications')).json()).data
    expect(notifications.length).toBe(1)
    const notification = notifications[0]
    expect(notification.isRead).toBe(false)
    expect((await call(contexts[1], `/notifications/${notification.id}/read`, 'POST')).status()).toBe(404)
    await page.clock.fastForward(31000)
    const card = page.locator('article').filter({ hasText: 'Notification actor 1' }).first()
    await expect(card).toBeVisible({ timeout: 20000 })
    await page.clock.resume()
    const marked = page.waitForResponse(response => response.url().endsWith(`/notifications/${notification.id}/read`) && response.request().method() === 'POST')
    await card.getByRole('button', { name: /Marquer/ }).click()
    expect((await marked).status()).toBe(200)
    await page.reload()
    expect((await (await call(contexts[0], '/notifications')).json()).data[0].isRead).toBe(true)
    await expect(page.locator('article').filter({ hasText: 'Notification actor 1' }).first()).toBeVisible()
    const receiver = await contexts[1].newPage()
    const direct = receiver.waitForResponse(response => response.url().endsWith('/conversations/direct') && response.request().method() === 'POST')
    await receiver.goto(`http://127.0.0.1:5182/messages?user=${users[0].id}`)
    const conversation = (await (await direct).json()).data
    await expect(receiver.getByPlaceholder(/message/i).last()).toBeVisible()
    const body = `Polling message ${Date.now()} width ${width}`
    expect((await call(contexts[0], `/conversations/${conversation.id}/messages`, 'POST', { body })).status()).toBe(201)
    await expect(receiver.getByText(body, { exact: true }).last()).toBeVisible({ timeout: 35000 })
    const persisted = (await (await call(contexts[1], `/conversations/${conversation.id}`)).json()).data
    expect(persisted.messages.filter(message => message.body === body)).toHaveLength(1)
    expect((await (await call(contexts[1], '/messages/unread-count')).json()).data.unreadCount).toBe(0)
    await receiver.reload()
    await expect(receiver.getByText(body, { exact: true }).last()).toBeVisible()
  } finally { await Promise.all(contexts.map(context => context.close())) }
})
