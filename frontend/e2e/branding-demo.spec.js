import { test, expect } from '@playwright/test'
import process from 'node:process'
test('isolated demo evidence: veterinarian profile and real test messaging', async ({ page }) => {
  test.skip(process.env.E2E_VETERINARIAN_FULLSTACK !== 'true', 'Requires the isolated SQLite demo fixture')
  test.setTimeout(90000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    localStorage.setItem('yazoo-onboarding-v1:1', 'done')
    localStorage.setItem('yazoo-locale', 'fr')
    localStorage.setItem('yazoo-theme', 'light')
    localStorage.setItem('yazoo-cookie-consent', 'necessary')
  })
  for (const [route, filename] of [['/discover/veterinarians', 'local-veterinarian-catalogue'], ['/discover/veterinarians/1', 'local-veterinarian-profile']]) {
    await page.goto(route)
    await expect(page.getByRole('heading', { name: 'Veterinaire DEMO Sefrou', exact: true })).toBeVisible({ timeout: 30000 })
    await expect.poll(() => page.locator('[data-brand-logo]').evaluateAll(ns => ns.length > 0 && ns.every(n => n.complete && n.naturalWidth > 0))).toBe(true)
    await page.screenshot({ path: `../output/qa/ideawave-branding/${filename}.png`, fullPage: true })
  }
  await page.goto('/login?returnTo=%2Fmessages')
  await page.getByLabel('Email', { exact: true }).fill('client.e2e@yazoo.test')
  await page.getByLabel('Mot de passe', { exact: true }).fill('Local-E2E-Only-2026!')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page).toHaveURL(/\/messages$/, { timeout: 30000 })
  await page.getByRole('button', { name: /Veterinaire DEMO E2E/ }).click()
  await expect(page.locator('article').getByText('Reponse fictive veterinaire E2E', { exact: true })).toBeVisible({ timeout: 30000 })
  await page.screenshot({ path: '../output/qa/ideawave-branding/local-messaging.png', fullPage: true })
})
