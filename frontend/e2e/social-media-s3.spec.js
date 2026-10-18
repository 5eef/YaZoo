import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
import process from 'node:process'

const origin = 'http://127.0.0.1:8012'
test.skip(process.env.E2E_SOCIAL_FULLSTACK !== 'true', 'Disposable SQLite and S3Mock only')
test('S3 HTTP media lifecycle, genuine video decoding and private access', async ({ browser }) => {
  test.setTimeout(120000)
  const context = await browser.newContext()
  const outsider = await browser.newContext()
  try {
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:5182/login')
    const generated = await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64
      const paint = canvas.getContext('2d'); paint.fillStyle = '#7c3aed'; paint.fillRect(0, 0, 64, 64)
      const image = canvas.toDataURL('image/png').split(',')[1]
      const stream = canvas.captureStream(10)
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      const chunks = []
      recorder.ondataavailable = event => chunks.push(event.data)
      const done = new Promise(resolve => { recorder.onstop = resolve })
      recorder.start()
      let frame = 0
      const animation = setInterval(() => { paint.fillStyle = frame++ % 2 ? '#7c3aed' : '#22c55e'; paint.fillRect(0, 0, 64, 64) }, 50)
      await new Promise(resolve => setTimeout(resolve, 600))
      recorder.stop(); await done; clearInterval(animation); stream.getTracks().forEach(track => track.stop())
      const video = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(new Blob(chunks, { type: 'video/webm' })) })
      return { image, video }
    })
    const image = { name: 'real.png', mimeType: 'image/png', buffer: Buffer.from(generated.image, 'base64') }
    const video = { name: 'real.webm', mimeType: 'video/webm', buffer: Buffer.from(generated.video, 'base64') }
    async function call(path, method = 'GET', data, multipart) {
      const csrf = (await context.cookies(origin)).find(cookie => cookie.name === 'XSRF-TOKEN')
      return context.request.fetch(`${origin}/api${path}`, { method, headers: { Accept: 'application/json', Origin: 'http://127.0.0.1:5182', ...(csrf ? { 'X-XSRF-TOKEN': decodeURIComponent(csrf.value) } : {}) }, ...(multipart ? { multipart } : data ? { data } : {}) })
    }
    await context.request.get(`${origin}/sanctum/csrf-cookie`)
    const created = await call('/auth/register', 'POST', { name: 'Isolated media owner', email: `media${Date.now()}@social-e2e.test`, password: 'Social-Isolated-Test-2026!', password_confirmation: 'Social-Isolated-Test-2026!', city: 'Sefrou' })
    expect(created.status()).toBe(201)
    const owner = (await created.json()).user
    const profile = await call(`/users/${owner.id}`, 'POST', undefined, { _method: 'PATCH', avatar_file: image, cover_photo_file: image })
    expect(profile.status()).toBe(200)
    const first = (await profile.json()).data
    const absolute = url => new URL(url, origin).href
    expect(await (await context.request.get(absolute(first.avatar))).body()).toEqual(image.buffer)
    const replacement = await call(`/users/${owner.id}`, 'POST', undefined, { _method: 'PATCH', avatar_file: image })
    expect(replacement.status()).toBe(200)
    expect((await context.request.get(absolute(first.avatar))).status()).toBe(404)
    expect((await context.request.get(absolute(first.coverPhoto))).status()).toBe(200)
    expect((await call(`/users/${owner.id}`, 'PATCH', { remove_avatar: true, remove_cover_photo: true })).status()).toBe(200)
    expect((await context.request.get(absolute(first.coverPhoto))).status()).toBe(404)
    const invalid = await call('/posts', 'POST', undefined, { media_file: { name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('<script>not an image</script>') } })
    expect(invalid.status()).toBe(422)
    const postResponse = await call('/posts', 'POST', undefined, { content: 'Genuine S3 video', media_file: video, visibility: 'public' })
    expect(postResponse.status(), await postResponse.text()).toBe(201)
    const post = (await postResponse.json()).data
    const url = `${origin}/api/media/posts/${post.id}`
    expect(await (await context.request.get(url)).body()).toEqual(video.buffer)
    expect((await context.request.get(url, { headers: { Range: 'bytes=0-31' } })).status()).toBe(206)
    await page.goto('http://127.0.0.1:5182/feed')
    const decoded = await page.evaluate(async media => {
      const video = document.createElement('video'); video.muted = true; video.src = media
      document.body.append(video)
      await Promise.race([new Promise((resolve, reject) => { video.onloadeddata = resolve; video.onerror = () => reject(new Error('Video decoding failed')) }), new Promise((_, reject) => setTimeout(() => reject(new Error('Video load timeout')), 15000))])
      await video.play(); const dimensions = [video.videoWidth, video.videoHeight]; video.remove(); return dimensions
    }, `/api/media/posts/${post.id}`)
    expect(decoded).toEqual([64, 64])
    expect((await call(`/posts/${post.id}`, 'PATCH', { visibility: 'private' })).status()).toBe(200)
    expect((await outsider.request.get(url)).status()).toBe(401)
    expect((await call(`/posts/${post.id}`, 'DELETE')).status()).toBe(200)
    expect((await context.request.get(url)).status()).toBe(404)
    const storyResponse = await call('/stories', 'POST', undefined, { media_file: video })
    expect(storyResponse.status(), await storyResponse.text()).toBe(201)
    const story = (await storyResponse.json()).data
    const storyMedia = await context.request.get(absolute(story.mediaUrl))
    expect(storyMedia.status()).toBe(200)
    expect(storyMedia.headers()['cache-control']).toContain('no-store')
    expect((await outsider.request.get(absolute(story.mediaUrl))).status()).toBe(404)
    expect((await call(`/stories/${story.id}`, 'DELETE')).status()).toBe(200)
    const feed = await (await call('/posts')).json()
    expect(feed.meta.last_page).toBeGreaterThan(1)
    await page.evaluate(id => localStorage.setItem(`yazoo-onboarding-v1:${id}`, 'done'), owner.id)
    await page.reload()
    const secondPage = page.waitForResponse(response => response.url().includes('/posts?page=2'))
    await page.getByRole('button', { name: /^(Next|Suivant)$/ }).click()
    expect((await secondPage).status()).toBe(200)
    await expect(page.getByText(`2 / ${feed.meta.last_page}`, { exact: true })).toBeVisible()
  } finally { await context.close(); await outsider.close() }
})
