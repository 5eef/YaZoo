import { expect as baseExpect, test } from '@playwright/test'
import process from 'node:process'
const expect = baseExpect.configure({ timeout: 20000 })

test.describe('logout against disposable Laravel SQLite', () => {
  test.skip(process.env.E2E_VETERINARIAN_FULLSTACK !== 'true', 'Requires the isolated local fixture')
  for (const width of [375, 1440]) {
    for (const reverse of [false, true]) {
      test(`account switching ${width}px reverse=${reverse} with server revocation and two tabs`, async ({ page, context }) => {
        test.setTimeout(90000)
        await page.setViewportSize({ width, height: 900 })
        await context.addInitScript(() => {
          localStorage.setItem('yazoo-locale', 'fr')
          localStorage.setItem('yazoo-onboarding-v1:1', 'done')
          localStorage.setItem('yazoo-onboarding-v1:2', 'done')
          localStorage.setItem('yazoo-cookie-consent', JSON.stringify({ cookies_necessary: true, cookies_analytics: false }))
        })
        const accounts = [
          { email: 'client.e2e@yazoo.test', name: 'Client DEMO E2E' },
          { email: 'vet.e2e@yazoo.test', name: 'Veterinaire DEMO E2E' },
        ]
        if (reverse) accounts.reverse()
        for (const account of accounts) {
          await page.goto('/login?returnTo=%2Fprofile')
          await page.getByLabel('Email', { exact: true }).fill(account.email)
          await page.getByLabel('Mot de passe', { exact: true }).fill('Local-E2E-Only-2026!')
          await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
          await expect(page).toHaveURL(/\/profile$/)
          await expect(page.getByRole('heading', { name: account.name, exact: true })).toBeVisible()
          const me = await page.request.get('http://127.0.0.1:8000/api/auth/me')
          expect(me.status()).toBe(200)
          const id = (await me.json()).user.id
          const otherTab = await context.newPage()
          await otherTab.goto(new URL('/profile', page.url()).href)
          await expect(otherTab.getByRole('heading', { name: account.name, exact: true })).toBeVisible()
          await page.goto(`/profile/${id}`)
          if (width < 1024) {
            await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
            await page.getByRole('dialog').getByRole('button', { name: 'Se déconnecter', exact: true }).click()
          } else await page.getByRole('banner').getByRole('button', { name: 'Se déconnecter', exact: true }).click()
          await expect(page).toHaveURL(/\/login/)
          await expect(otherTab).toHaveURL(/\/login/)
          await expect.poll(async () => (await page.request.get('http://127.0.0.1:8000/api/auth/me')).status()).toBe(401)
          expect((await context.cookies('http://127.0.0.1:8000')).some(cookie => cookie.name === 'yazoo_api_token')).toBe(false)
          await page.goBack()
          await expect(page).toHaveURL(/\/login/)
          await page.reload()
          await expect(page.getByRole('heading', { name: account.name, exact: true })).toHaveCount(0)
          await otherTab.close()
        }
      })
    }
  }
})
