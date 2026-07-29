import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router'

import { I18nProvider } from '../../contexts/I18nContext'
import SeoManager from './SeoManager'
import { INDEXABLE_PATHS, getRouteSeo } from './seoConfig'

function RouteControls() {
  const navigate = useNavigate()

  return (
    <>
      <SeoManager />
      <button type="button" onClick={() => navigate('/login')}>
        Login
      </button>
      <button type="button" onClick={() => navigate('/')}>
        Home
      </button>
    </>
  )
}

describe('SeoManager', () => {
  it('builds localized metadata for an indexable public route', () => {
    const translations = {
      'legal.about.intro': 'Présentation de YaZoo.',
      'legal.about.title': 'À propos de YaZoo',
    }
    const seo = getRouteSeo('/about/', 'fr', (key) => translations[key])

    expect(seo).toMatchObject({
      canonicalUrl: 'https://yazoo.azurewebsites.net/about',
      description: 'Présentation de YaZoo.',
      indexable: true,
      locale: 'fr_MA',
      title: 'À propos de YaZoo | YaZoo',
    })
  })

  it('marks account and protected routes as non-indexable', () => {
    const seo = getRouteSeo('/marketplace/animals', 'en', () => 'Animal community')

    expect(seo).toMatchObject({
      canonicalUrl: 'https://yazoo.azurewebsites.net/marketplace/animals',
      indexable: false,
      locale: 'en_US',
      structuredData: false,
      title: 'YaZoo',
    })
  })

  it('keeps public listing detail routes indexable with their own canonical URL', () => {
    const translations = {
      'publicMarketplace.animalsDescription': 'Animaux approuves.',
      'publicMarketplace.animalsTitle': 'Animaux au Maroc',
    }
    const seo = getRouteSeo(
      '/discover/animals/42',
      'fr',
      (key) => translations[key],
    )

    expect(seo).toMatchObject({
      canonicalUrl: 'https://yazoo.azurewebsites.net/discover/animals/42',
      description: 'Animaux approuves.',
      indexable: true,
      title: 'Animaux au Maroc | YaZoo',
    })
  })

  it('updates robots, canonical metadata and homepage structured data during navigation', async () => {
    const { getByRole } = render(
      <MemoryRouter initialEntries={['/']}>
        <I18nProvider>
          <RouteControls />
        </I18nProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
        'content',
        expect.stringContaining('index, follow'),
      )
    })
    expect(document.getElementById('yazoo-structured-data')).toBeInTheDocument()

    getByRole('button', { name: 'Login' }).click()

    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, nofollow',
      )
    })
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://yazoo.azurewebsites.net/login',
    )
    expect(document.getElementById('yazoo-structured-data')).not.toBeInTheDocument()

    getByRole('button', { name: 'Home' }).click()

    await waitFor(() => {
      expect(document.getElementById('yazoo-structured-data')).toBeInTheDocument()
    })
  })

  it('keeps the sitemap aligned with every indexable route', () => {
    const sitemap = readFileSync(
      path.resolve(process.cwd(), 'public/sitemap.xml'),
      'utf8',
    )
    const xml = new DOMParser().parseFromString(sitemap, 'application/xml')
    const sitemapPaths = [...xml.querySelectorAll('loc')]
      .map((element) => new URL(element.textContent).pathname)
      .sort()

    expect(xml.querySelector('parsererror')).not.toBeInTheDocument()
    expect(sitemapPaths).toEqual([...INDEXABLE_PATHS].sort())
    expect(sitemapPaths.some((path) => path.startsWith('/marketplace'))).toBe(false)
  })

  it('ships valid homepage structured data and an absolute sitemap reference', () => {
    const indexHtml = readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8')
    const robots = readFileSync(
      path.resolve(process.cwd(), 'public/robots.txt'),
      'utf8',
    )
    const documentNode = new DOMParser().parseFromString(indexHtml, 'text/html')
    const structuredData = JSON.parse(
      documentNode.getElementById('yazoo-structured-data').textContent,
    )

    expect(structuredData['@context']).toBe('https://schema.org')
    expect(structuredData['@graph'].map((entry) => entry['@type'])).toEqual([
      'Organization',
      'WebSite',
    ])
    expect(robots).toContain(
      'Sitemap: https://yazoo.azurewebsites.net/sitemap.xml',
    )
  })
})
