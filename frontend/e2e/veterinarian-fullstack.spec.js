import { expect as baseExpect, test } from '@playwright/test'
import process from 'node:process'
const expect = baseExpect.configure({ timeout: 20000 })

test.describe('Veterinarian full stack (isolated Laravel)', () => {
  test.skip(process.env.E2E_VETERINARIAN_FULLSTACK !== 'true', 'Requires disposable Laravel SQLite fixture')
  test('guest selects a slot, logs in, books and sends a persistent message', async ({ page, browser }) => {
    test.setTimeout(120000)
    await page.addInitScript(() => localStorage.setItem('yazoo-locale', 'fr'))
    await page.goto('/discover/veterinarians')
    await page.getByLabel('Ville', { exact: true }).fill('Sefrou')
    await page.getByRole('button', { name: 'Rechercher', exact: true }).click()
    await page.getByRole('link', { name: /Veterinaire DEMO Sefrou/ }).first().click()
    await expect(page).toHaveURL(/\/discover\/veterinarians\/\d+$/)
    await expect(page.getByRole('heading', { name: 'Veterinaire DEMO Sefrou', level: 1 })).toBeVisible()
    const detailURL = page.url()
    const slots = page.getByRole('combobox')
    const available = await slots.locator('option:not([disabled])').evaluateAll((options) => options.find((option) => option.value)?.value)
    expect(available).toBeTruthy()
    await slots.selectOption(available)
    const selected = await slots.inputValue()
    await page.getByRole('link', { name: 'Prendre rendez-vous', exact: true }).click()
    await expect(page).toHaveURL(/login\?returnTo=/)
    await page.getByLabel('Email', { exact: true }).fill('client.e2e@yazoo.test')
    await page.getByLabel('Mot de passe', { exact: true }).fill('Local-E2E-Only-2026!')
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`veterinarian-appointments\\?veterinarian=\\d+&slot=${selected}`))
    await expect(page.getByRole('combobox').first()).toHaveValue(selected, { timeout: 20000 })
    await page.getByLabel(/Type d.animal/).fill('Chat')
    await page.getByLabel(/Motif/).fill('Consultation fictive E2E')
    const booking = page.waitForResponse((response) => /\/veterinarians\/\d+\/appointments$/.test(response.url()) && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Demander le rendez-vous', exact: true }).click()
    expect((await booking).ok()).toBeTruthy()
    await expect(page.getByText('Consultation fictive E2E', { exact: true })).toBeVisible()
    await page.screenshot({ path: '../output/qa/local-booking.png', fullPage: true })
    await page.reload()
    await expect(page.getByText('Consultation fictive E2E', { exact: true })).toBeVisible()
    await page.goto(detailURL)
    let directConversationRequests = 0
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/conversations/direct')) directConversationRequests++
    })
    await page.getByRole('link', { name: 'Envoyer un message', exact: true }).click()
    await expect(page).toHaveURL(/messages\?conversation=/)
    const composer = page.getByPlaceholder(/message/i).last()
    await composer.fill('Message fictif E2E persistant')
    const sent = page.waitForResponse((response) => /\/conversations\/\d+\/messages$/.test(response.url()) && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Envoyer', exact: true }).click()
    expect((await sent).ok()).toBeTruthy()
    await page.reload()
    await expect(page.getByText('Message fictif E2E persistant', { exact: true }).last()).toBeVisible()
    await page.screenshot({ path: '../output/qa/local-messaging.png', fullPage: true })
    expect(directConversationRequests).toBe(1)
    const receiverContext = await browser.newContext()
    try {
      const receiver = await receiverContext.newPage()
      await receiver.addInitScript(() => localStorage.setItem('yazoo-locale', 'fr'))
      await receiver.goto(new URL('/login?returnTo=%2Fmessages', page.url()).href)
      await receiver.getByLabel('Email', { exact: true }).fill('vet.e2e@yazoo.test')
      await receiver.getByLabel('Mot de passe', { exact: true }).fill('Local-E2E-Only-2026!')
      await receiver.getByRole('button', { name: 'Se connecter', exact: true }).click()
      await expect(receiver).toHaveURL(/\/messages$/)
      await receiver.getByRole('button', { name: /Client DEMO E2E/ }).click()
      await expect(receiver.getByText('Message fictif E2E persistant', { exact: true }).last()).toBeVisible()
      await receiver.getByPlaceholder(/message/i).last().fill('Reponse fictive veterinaire E2E')
      await receiver.getByRole('button', { name: 'Envoyer', exact: true }).click()
      await expect(receiver.getByText('Reponse fictive veterinaire E2E', { exact: true }).last()).toBeVisible()
      await expect(page.getByText('Reponse fictive veterinaire E2E', { exact: true }).last()).toBeVisible({ timeout: 25000 })
      await page.reload()
      await expect(page.getByText('Reponse fictive veterinaire E2E', { exact: true }).last()).toBeVisible()
      await receiver.goto(new URL('/veterinarian-appointments', page.url()).href)
      await expect(receiver.getByText('Consultation fictive E2E', { exact: true })).toBeVisible()
    } finally {
      await receiverContext.close()
    }
  })

  for (const locale of ['fr', 'en', 'ar']) {
    for (const theme of ['light', 'dark']) {
      for (const width of [320, 360, 375, 390, 412, 768, 1024, 1440]) {
        test(`public profile ${locale} ${theme} ${width}px`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 })
          await page.addInitScript(({ locale, theme }) => {
            localStorage.setItem('yazoo-locale', locale)
            localStorage.setItem('yazoo-theme', theme)
          }, { locale, theme })
          await page.goto('/discover/veterinarians/1')
          await expect(page.getByRole('heading', { level: 1, name: 'Veterinaire DEMO Sefrou' })).toBeVisible({ timeout: 20000 })
          await expect(page.locator('select')).toBeVisible()
          await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
          if (width === 320 && locale === 'ar' && theme === 'dark') await page.screenshot({ path: '../output/veterinarian-ar-dark-320.png', fullPage: true })
        })
      }
    }
  }
})
