export const SITE_NAME = 'YaZoo'
const configuredSiteUrl = (
  import.meta.env?.VITE_SITE_URL ?? globalThis.process?.env?.VITE_SITE_URL ?? ''
).trim()
export const SITE_URL = configuredSiteUrl.replace(/\/$/, '') ||
  (typeof globalThis.location === 'undefined' ? '' : globalThis.location.origin)
export const SOCIAL_IMAGE_URL = `${SITE_URL}/icon-512.png`
export const INDEX_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
export const NOINDEX_ROBOTS = 'noindex, nofollow'

const PUBLIC_ROUTE_METADATA = {
  '/': {
    titleKeys: ['landing.heroLineOne', 'landing.heroLineTwo'],
    descriptionKey: 'landing.heroDescription',
    structuredData: true,
  },
  '/about': {
    titleKey: 'legal.about.title',
    descriptionKey: 'legal.about.intro',
  },
  '/accessibility': {
    titleKey: 'accessibility.title',
    descriptionKey: 'accessibility.intro',
  },
  '/cgu': {
    titleKey: 'legal.terms.title',
    descriptionKey: 'legal.terms.intro',
  },
  '/contact': {
    titleKey: 'contact.title',
    descriptionKey: 'contact.description',
  },
  '/demo-mobile': {
    titleKey: 'proPages.mobile.title',
    descriptionKey: 'proPages.mobile.intro',
  },
  '/discover/animals': {
    titleKey: 'publicMarketplace.animalsTitle',
    descriptionKey: 'publicMarketplace.animalsDescription',
  },
  '/discover/products': {
    titleKey: 'publicMarketplace.productsTitle',
    descriptionKey: 'publicMarketplace.productsDescription',
  },
  '/discover/services': {
    titleKey: 'publicMarketplace.servicesTitle',
    descriptionKey: 'publicMarketplace.servicesDescription',
  },
  '/discover/veterinarians': {
    titleKey: 'publicMarketplace.veterinariansTitle',
    descriptionKey: 'publicMarketplace.veterinariansDescription',
  },
  '/impact': {
    titleKey: 'impact.title',
    descriptionKey: 'impact.intro',
  },
  '/partner': {
    titleKey: 'proPages.partner.title',
    descriptionKey: 'proPages.partner.intro',
  },
  '/privacy': {
    titleKey: 'legal.privacy.title',
    descriptionKey: 'legal.privacy.intro',
  },
  '/pros': {
    titleKey: 'proPages.pros.title',
    descriptionKey: 'proPages.pros.intro',
  },
  '/rules': {
    titleKey: 'legal.rules.title',
    descriptionKey: 'legal.rules.intro',
  },
  '/trust': {
    titleKey: 'trustSafety.title',
    descriptionKey: 'trustSafety.intro',
  },
}

export const INDEXABLE_PATHS = Object.freeze(Object.keys(PUBLIC_ROUTE_METADATA))

const OPEN_GRAPH_LOCALES = {
  ar: 'ar_MA',
  en: 'en_US',
  fr: 'fr_MA',
}

export function getRouteSeo(pathname, locale, translate) {
  const normalizedPath = normalizePathname(pathname)
  const routeMetadata =
    PUBLIC_ROUTE_METADATA[normalizedPath] ??
    getPublicListingRouteMetadata(normalizedPath)

  if (!routeMetadata) {
    return {
      canonicalUrl: `${SITE_URL}${normalizedPath}`,
      description: translate('landing.heroDescription'),
      indexable: false,
      locale: OPEN_GRAPH_LOCALES[locale] ?? OPEN_GRAPH_LOCALES.fr,
      structuredData: false,
      title: SITE_NAME,
    }
  }

  const pageTitle = routeMetadata.titleKeys
    ? routeMetadata.titleKeys.map((key) => translate(key)).join(' ')
    : translate(routeMetadata.titleKey)

  return {
    canonicalUrl: `${SITE_URL}${normalizedPath === '/' ? '/' : normalizedPath}`,
    description: translate(routeMetadata.descriptionKey),
    indexable: true,
    locale: OPEN_GRAPH_LOCALES[locale] ?? OPEN_GRAPH_LOCALES.fr,
    structuredData: routeMetadata.structuredData === true,
    title: `${pageTitle} | ${SITE_NAME}`,
  }
}

function getPublicListingRouteMetadata(pathname) {
  const match = pathname.match(
    /^\/discover\/(animals|products|services|veterinarians)\/\d+$/,
  )

  if (!match) {
    return null
  }

  return PUBLIC_ROUTE_METADATA[`/discover/${match[1]}`]
}

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') {
    return '/'
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}
