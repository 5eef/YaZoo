import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { JSDOM } from 'jsdom'

import { translate } from '../src/lib/i18n.js'
import {
  INDEXABLE_PATHS,
  getRouteSeo,
} from '../src/components/seo/seoConfig.js'

const frontendDirectory = path.resolve(import.meta.dirname, '..')
const outputDirectory = path.resolve(
  frontendDirectory,
  process.env.VITE_BUILD_OUT_DIR ?? 'dist',
)
const indexPath = path.join(outputDirectory, 'index.html')
const sourceHtml = await readFile(indexPath, 'utf8')

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

console.log(
  `Static SEO entry pages generated: ${INDEXABLE_PATHS.length - 1}`,
)

function setMetaTag(document, attribute, key, content) {
  const element = document.head.querySelector(`meta[${attribute}="${key}"]`)

  if (!element) {
    throw new Error(`Missing ${attribute}="${key}" in the built index.html`)
  }

  element.setAttribute('content', content)
}
