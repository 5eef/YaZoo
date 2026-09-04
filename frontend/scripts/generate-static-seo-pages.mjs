import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { JSDOM } from 'jsdom'

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

if (SITE_URL) {
  for (const routePath of INDEXABLE_PATHS) {
    if (routePath === '/') {
      continue
    }

    const seo = getRouteSeo(routePath, 'fr', (key) => translate('fr', key))
    const dom = new JSDOM(sourceHtml)
    const { document } = dom.window

    document.documentElement.lang = 'fr'
    document.title = seo.title
    setMetaTag(document, 'name', 'description', seo.description)
    setMetaTag(
      document,
      'name',
      'robots',
      'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    )
    setMetaTag(document, 'property', 'og:title', seo.title)
    setMetaTag(document, 'property', 'og:description', seo.description)
    setMetaTag(document, 'property', 'og:url', seo.canonicalUrl)
    setMetaTag(document, 'name', 'twitter:title', seo.title)
    setMetaTag(document, 'name', 'twitter:description', seo.description)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', seo.canonicalUrl)
    document.getElementById('yazoo-structured-data')?.remove()

    const relativePath = `${routePath.slice(1)}.html`
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
    ...INDEXABLE_PATHS.map((routePath) => `  <url><loc>${SITE_URL}${routePath}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n')

  await writeFile(path.join(outputDirectory, 'sitemap.xml'), sitemap, 'utf8')
  await writeFile(
    path.join(outputDirectory, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    'utf8',
  )
}

console.log(
  SITE_URL
    ? `Static SEO entry pages generated: ${INDEXABLE_PATHS.length - 1}`
    : 'Static SEO entry pages skipped: VITE_SITE_URL is not configured.',
)

function setMetaTag(document, attribute, key, content) {
  const element = document.head.querySelector(`meta[${attribute}="${key}"]`)

  if (!element) {
    throw new Error(`Missing ${attribute}="${key}" in the built index.html`)
  }

  element.setAttribute('content', content)
}
