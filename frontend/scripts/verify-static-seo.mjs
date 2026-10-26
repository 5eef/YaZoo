import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { JSDOM } from 'jsdom'

const origin = 'https://yazoo-showcase.pages.dev'
const release = JSON.parse(await readFile('dist/release.json', 'utf8'))
assert.match(release.commit, /^[a-f0-9]{40}$/)
assert.equal(typeof release.sourceDirty, 'boolean')
const sitemap = new JSDOM(await readFile('dist/sitemap.xml', 'utf8'), { contentType: 'text/xml' }).window.document
assert.equal(sitemap.querySelector('parsererror'), null)
const paths = [...sitemap.querySelectorAll('loc')].map((element) => new URL(element.textContent).pathname)
assert.deepEqual(paths.sort(), ['/about', '/ar', '/en', '/fr', '/partner', '/pros'].sort())
const titles = new Set()
const rows = []
for (const pathname of ['/', ...paths]) {
  const filename = pathname === '/' ? 'index' : pathname.slice(1)
  const document = new JSDOM(await readFile(`dist/${filename}.html`, 'utf8')).window.document
  const locale = /^\/(fr|en|ar)$/.exec(pathname)?.[1] || 'fr'
  const canonical = pathname === '/' ? `${origin}/fr` : `${origin}${pathname}`
  assert.equal(document.documentElement.lang, locale)
  assert.equal(document.documentElement.dir, locale === 'ar' ? 'rtl' : 'ltr')
  assert.equal(document.querySelectorAll('h1').length, 1)
  assert.ok(document.querySelector('#root').textContent.length > 500)
  assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1)
  assert.equal(document.querySelector('link[rel="canonical"]').href, canonical)
  assert.ok(document.querySelector('meta[name="description"]').content.length > 30)
  assert.equal(document.querySelector('meta[property="og:url"]').content, canonical)
  assert.ok(document.querySelector('meta[property="og:image"]').content.startsWith(`${origin}/`))
  assert.ok(document.querySelector('meta[name="twitter:image"]').content.startsWith(`${origin}/`))
  if (pathname !== '/') {
    assert.ok(!titles.has(document.title), `Duplicate title: ${document.title}`)
    titles.add(document.title)
  }
  const alternates = [...document.querySelectorAll('link[hreflang]')]
  if (pathname === '/' || /^\/(fr|en|ar)$/.test(pathname)) {
    assert.deepEqual(alternates.map((element) => [element.hreflang, element.href]), ['fr', 'en', 'ar'].map((language) => [language, `${origin}/${language}`]))
  } else assert.equal(alternates.length, 0)
  for (const image of document.querySelectorAll('img')) {
    assert.ok(image.hasAttribute('alt'))
    assert.ok(!image.src.startsWith('/src/'))
    if (image.src.startsWith('/')) await access(`dist${image.src.split('?')[0]}`)
  }
  for (const preload of document.querySelectorAll('link[as="image"]')) {
    assert.ok(!preload.href.startsWith('/src/'))
    await access(`dist${preload.href}`)
  }
  rows.push({ pathname, locale, title: document.title, description: document.querySelector('meta[name="description"]').content, canonical, indexable: true, hreflang: alternates.length, test: 'PASS' })
}
for (const path of ['admin/*', 'profile/*', 'messages', 'settings/*', 'discover/*']) assert.ok((await readFile('dist/_headers', 'utf8')).includes(`/${path}\n  X-Robots-Tag: noindex, nofollow`))
assert.ok((await readFile('dist/robots.txt', 'utf8')).includes(`Sitemap: ${origin}/sitemap.xml`))
console.log(JSON.stringify(rows, null, 2))
