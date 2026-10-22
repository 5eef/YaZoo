import { expect, test } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { mockApi } from './branding-fixtures'

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`Reels video, navigation and reload ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => {
      localStorage.setItem('yazoo-locale', 'fr')
      localStorage.setItem('yazoo-onboarding-v1:1', 'done')
      localStorage.setItem('yazoo-cookie-consent', JSON.stringify({ cookies_necessary: true, cookies_analytics: false }))
    })
    await mockApi(page, true)
    await page.goto('/feed')
    const bytes = Buffer.from(await page.evaluate(async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 64; canvas.height = 96
      const paint = canvas.getContext('2d')
      const stream = canvas.captureStream(10)
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      const chunks = []
      recorder.ondataavailable = ({ data }) => chunks.push(data)
      const stopped = new Promise((resolve) => { recorder.onstop = resolve })
      recorder.start()
      let frame = 0
      const timer = setInterval(() => { paint.fillStyle = frame++ % 2 ? '#7c3aed' : '#22c55e'; paint.fillRect(0, 0, 64, 96) }, 40)
      await new Promise((resolve) => setTimeout(resolve, 400))
      recorder.stop(); await stopped
      clearInterval(timer); stream.getTracks().forEach((track) => track.stop())
      return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()))
    }))
    let liked = false
    let videoRequests = 0
    const post = () => ({ id: 8, content: 'Synthetic vertical reel', mediaKind: 'video', mediaUrl: '/api/media/posts/8', visibility: 'public', author: { id: 1, name: 'Synthetic owner' }, comments: [], likes: liked ? 1 : 0, liked, userReaction: liked ? 'like' : null })
    await page.route('**/api/posts?**', async (route) => {
      const url = new URL(route.request().url())
      // The shared layout may still finish a general feed request after navigation.
      if (url.searchParams.get('media_kind') !== 'video') return route.fallback()
      videoRequests += 1
      await route.fulfill({ json: { data: [post()], meta: { last_page: 1 } } })
    })
    await page.route('**/api/posts/8/like', async (route) => {
      expect(route.request().method()).toBe('POST')
      liked = true
      await route.fulfill({ json: { data: post() } })
    })
    await page.route('**/api/media/posts/8', (route) => route.fulfill({ contentType: 'video/webm', body: bytes }))
    await page.goto('/reels')
    await expect(page.getByRole('heading', { name: 'Reels', exact: true })).toBeVisible()
    await expect.poll(() => videoRequests).toBeGreaterThan(0)
    const video = page.locator('video')
    await expect(video).toHaveAttribute('playsinline', '')
    await expect.poll(() => video.evaluate((element) => element.videoWidth)).toBe(64)
    await video.evaluate((element) => element.play())
    await expect.poll(() => video.evaluate((element) => element.currentTime)).toBeGreaterThan(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    const reaction = page.locator('button[title="J\'aime"]').first()
    await reaction.click()
    await expect.poll(() => liked).toBe(true)
    const requestsBeforeReload = videoRequests
    await page.reload()
    await expect.poll(() => videoRequests).toBeGreaterThan(requestsBeforeReload)
    await expect(page.getByText('Synthetic vertical reel', { exact: true })).toBeVisible()
    await expect(page.locator('button[title="J\'aime"]').first()).toHaveClass(/bg-violet-600/)
    // Existing shared desktop/sidebar and mobile drawer expose the new destination.
    if (width < 1024) {
      await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
      await expect(page.getByRole('dialog').getByRole('link', { name: 'Reels', exact: true })).toBeVisible()
    } else {
      await expect(page.getByRole('link', { name: 'Reels', exact: true }).first()).toBeVisible()
    }
  })
}
