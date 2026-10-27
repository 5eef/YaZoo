import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'

import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

import { translate } from '../src/lib/i18n.js'
import {
  INDEXABLE_PATHS,
  SITE_URL,
  getRouteSeo,
} from '../src/components/seo/seoConfig.js'

const frontendDirectory = path.resolve(import.meta.dirname, '..')
const outputDirectory = path.resolve(
  frontendDirectory,
  process.env.VITE_BUILD_OUT_DIR ?? 'dist',
)
const indexPath = path.join(outputDirectory, 'index.html')
const sourceHtml = await readFile(indexPath, 'utf8')
const manifest = JSON.parse(await readFile(path.join(outputDirectory, '.vite/manifest.json'), 'utf8'))
let commit = null
let sourceDirty = null
try {
  const options = { cwd: path.dirname(frontendDirectory), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  // Build provenance must not execute a binary supplied through the caller's PATH.
  const readGit = (args) => (process.platform === 'win32'
    ? execFileSync('C:/Program Files/Git/cmd/git.exe', args, options)
    : execFileSync('/usr/bin/git', args, options)).trim()
  commit = readGit(['rev-parse', 'HEAD'])
  sourceDirty = Boolean(readGit(['status', '--porcelain', '--untracked-files=no', '--', 'frontend', 'backend', 'mobile']))
} catch {
  // Source archives and frontend Docker contexts need not contain .git or git.
  // Unknown provenance remains explicit rather than breaking the existing build.
}
if (process.env.GITHUB_SHA) {
  if (!/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA)) throw new Error('Invalid GITHUB_SHA')
  commit = process.env.GITHUB_SHA
}
await writeFile(path.join(outputDirectory, 'release.json'), JSON.stringify({ commit, sourceDirty }, null, 2) + '\n', 'utf8')

if (SITE_URL) {
  const origin = new URL(SITE_URL)
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw new Error('VITE_SITE_URL must be an HTTPS origin without credentials')
  const server = await createServer({ configLoader: 'native', server: { middlewareMode: true }, appType: 'custom' })
  try {
  const { prerender } = await server.ssrLoadModule('/scripts/prerender-entry.jsx')
  const routes = [...INDEXABLE_PATHS, '/fr', '/en', '/ar']
  const sitemapPaths = []
  for (const routePath of routes) {
    const locale = routePath.match(/^\/(fr|en|ar)$/)?.[1] || 'fr'
    const componentPath = /^\/(fr|en|ar)$/.test(routePath) ? '/' : routePath

    const seo = getRouteSeo(routePath, locale, (key) => translate(locale, key))
    const dom = new JSDOM(sourceHtml)
    const { document } = dom.window

    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.title = seo.title
    setMetaTag(document, 'name', 'description', seo.description)
    setMetaTag(
      document,
      'name',
      'robots',
      seo.indexable ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' : 'noindex, nofollow',
    )
    setMetaTag(document, 'property', 'og:title', seo.title)
    setMetaTag(document, 'property', 'og:description', seo.description)
    setMetaTag(document, 'property', 'og:url', seo.canonicalUrl)
    setMetaTag(document, 'name', 'twitter:title', seo.title)
    setMetaTag(document, 'name', 'twitter:description', seo.description)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', seo.canonicalUrl)
    document.getElementById('yazoo-structured-data')?.remove()
    document.querySelectorAll('link[data-yazoo-hreflang]').forEach((link) => link.remove())

    setMetaTag(document, 'property', 'og:locale', seo.locale)
    setMetaTag(document, 'property', 'og:image', `${SITE_URL}/icon-512.png?v=2026`)
    setMetaTag(document, 'name', 'twitter:image', `${SITE_URL}/icon-512.png?v=2026`)
    const content = prerender(componentPath, locale)
    document.getElementById('root').innerHTML = content
    for (const image of document.querySelectorAll('img[src^="/src/"]')) {
      const asset = manifest[image.getAttribute('src').slice(1)]
      if (!asset) throw new Error(`Missing built asset: ${image.getAttribute('src')}`)
      image.setAttribute('src', `/${asset.file}`)
    }
    // React emits an automatic preload for the high-priority hero during SSR.
    // Resolve that URL too, otherwise crawlers request an absent source asset.
    for (const preload of document.querySelectorAll('link[as="image"][href^="/src/"]')) {
      const asset = manifest[preload.getAttribute('href').slice(1)]
      if (!asset) throw new Error(`Missing built preload: ${preload.getAttribute('href')}`)
      preload.setAttribute('href', `/${asset.file}`)
    }
    if (componentPath === '/') {
      for (const language of ['fr', 'en', 'ar']) {
        const link = document.createElement('link')
        link.rel = 'alternate'
        link.hreflang = language
        link.href = `${SITE_URL}/${language}`
        link.dataset.yazooHreflang = ''
        document.head.append(link)
      }
      const schema = document.createElement('script')
      schema.id = 'yazoo-structured-data'
      schema.type = 'application/ld+json'
      schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'YaZoo', url: `${SITE_URL}/`, inLanguage: ['fr', 'en', 'ar'] })
      document.head.append(schema)
    }
    if (seo.indexable && content && routePath !== '/') sitemapPaths.push(routePath)
    const relativePath = routePath === '/' ? 'index.html' : `${routePath.slice(1)}.html`
    const outputPath = path.join(outputDirectory, relativePath)

    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(
      outputPath,
      `<!doctype html>\n${document.documentElement.outerHTML}\n`,
      'utf8',
    )
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapPaths.map((routePath) => `  <url><loc>${SITE_URL}${routePath}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n')

  await writeFile(path.join(outputDirectory, 'sitemap.xml'), sitemap, 'utf8')
  await writeFile(
    path.join(outputDirectory, 'robots.txt'),
    `User-agent: *\nAllow: /\n# Private routes use noindex and server authorization; crawling remains allowed to read noindex.\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    'utf8',
  )
  } finally { await server.close() }
}

console.log(
  SITE_URL
    ? `SEO entry pages generated: ${INDEXABLE_PATHS.length + 3}; React prerender: home FR/EN/AR, about, pros, partner.`
    : 'Static SEO entry pages skipped: VITE_SITE_URL is not configured.',
)

function setMetaTag(document, attribute, key, content) {
  const element = document.head.querySelector(`meta[${attribute}="${key}"]`)

  if (!element) {
    throw new Error(`Missing ${attribute}="${key}" in the built index.html`)
  }

  element.setAttribute('content', content)
}
