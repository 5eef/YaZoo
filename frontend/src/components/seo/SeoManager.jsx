import { useEffect } from 'react'
import { useLocation } from 'react-router'

import { useI18n } from '../../hooks/useI18n'
import {
  INDEX_ROBOTS,
  NOINDEX_ROBOTS,
  SITE_NAME,
  SITE_URL,
  SOCIAL_IMAGE_URL,
  getRouteSeo,
} from './seoConfig'

function SeoManager() {
  const { locale, t } = useI18n()
  const { pathname } = useLocation()

  useEffect(() => {
    const seo = getRouteSeo(pathname, locale, t)

    document.title = seo.title
    setMetaTag('name', 'description', seo.description)
    setMetaTag('name', 'robots', seo.indexable ? INDEX_ROBOTS : NOINDEX_ROBOTS)
    setMetaTag('property', 'og:title', seo.title)
    setMetaTag('property', 'og:description', seo.description)
    setMetaTag('property', 'og:type', 'website')
    setMetaTag('property', 'og:url', seo.canonicalUrl)
    setMetaTag('property', 'og:locale', seo.locale)
    setMetaTag('property', 'og:site_name', SITE_NAME)
    setMetaTag('property', 'og:image', SOCIAL_IMAGE_URL)
    setMetaTag('property', 'og:image:alt', `Logo ${SITE_NAME}`)
    setMetaTag('name', 'twitter:card', 'summary')
    setMetaTag('name', 'twitter:title', seo.title)
    setMetaTag('name', 'twitter:description', seo.description)
    setMetaTag('name', 'twitter:image', SOCIAL_IMAGE_URL)
    setMetaTag('name', 'twitter:image:alt', `Logo ${SITE_NAME}`)
    setCanonicalUrl(seo.canonicalUrl)
    setStructuredData(seo.structuredData)
  }, [locale, pathname, t])

  return null
}

function setMetaTag(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }

  element.setAttribute('content', content)
}

function setCanonicalUrl(url) {
  let element = document.head.querySelector('link[rel="canonical"]')

  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.append(element)
  }

  element.setAttribute('href', url)
}

function setStructuredData(enabled) {
  const existingElement = document.getElementById('yazoo-structured-data')

  if (!enabled) {
    existingElement?.remove()
    return
  }

  const element = existingElement ?? document.createElement('script')
  element.id = 'yazoo-structured-data'
  element.type = 'application/ld+json'
  element.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: SOCIAL_IMAGE_URL,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        inLanguage: ['fr', 'ar', 'en'],
        publisher: {
          '@id': `${SITE_URL}/#organization`,
        },
      },
    ],
  })

  if (!existingElement) {
    document.head.append(element)
  }
}

export default SeoManager
