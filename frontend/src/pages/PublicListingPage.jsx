import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'

import { getPublicMarketplaceListingRequest } from '../api/publicMarketplace'
import {
  formatListingDate,
  formatListingPrice,
  getBadgeTranslationKey,
} from '../components/marketplace/publicListingFormat'
import PublicMarketplaceShell from '../components/marketplace/PublicMarketplaceShell'
import {
  getPublicMarketplaceSection,
  getPublicMarketplaceSectionPath,
  isPublicMarketplaceSection,
} from '../components/marketplace/publicMarketplaceConfig'
import Avatar from '../components/ui/Avatar'
import { useI18n } from '../hooks/useI18n'

function PublicListingPage() {
  const { listingId, section } = useParams()
  const { locale, t } = useI18n()
  const [listing, setListing] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const definition = getPublicMarketplaceSection(section)
  const hasValidId = /^\d+$/.test(listingId ?? '')

  useEffect(() => {
    if (!isPublicMarketplaceSection(section) || !hasValidId) {
      return undefined
    }

    let cancelled = false

    const loadListing = async () => {
      setIsLoading(true)

      try {
        const response = await getPublicMarketplaceListingRequest(section, listingId)

        if (!cancelled) {
          setListing(response.data?.data ?? null)
          setNotFound(false)
          setHasError(false)
        }
      } catch (error) {
        if (!cancelled) {
          setListing(null)
          setNotFound(error?.response?.status === 404)
          setHasError(error?.response?.status !== 404)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadListing()

    return () => {
      cancelled = true
    }
  }, [hasValidId, listingId, reloadKey, section])

  useEffect(() => {
    if (!listing) {
      return
    }

    const description = String(listing.description || t(definition.descriptionKey))
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160)
    const locationSuffix = listing.location ? ` · ${listing.location}` : ''
    const title = `${listing.title}${locationSuffix} | YaZoo`
    const canonicalUrl = `https://yazoo.azurewebsites.net/discover/${section}/${listingId}`

    document.title = title
    setMetaContent('meta[name="description"]', description)
    setMetaContent('meta[property="og:title"]', title)
    setMetaContent('meta[property="og:description"]', description)
    setMetaContent('meta[property="og:type"]', section === 'products' ? 'product' : 'article')
    setMetaContent('meta[property="og:url"]', canonicalUrl)
    setMetaContent('meta[name="twitter:title"]', title)
    setMetaContent('meta[name="twitter:description"]', description)
    setMetaContent(
      'meta[name="robots"]',
      'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    )

    if (listing.imageUrl) {
      setMetaContent('meta[property="og:image"]', listing.imageUrl)
      setMetaContent('meta[property="og:image:alt"]', listing.title)
      setMetaContent('meta[name="twitter:image"]', listing.imageUrl)
      setMetaContent('meta[name="twitter:image:alt"]', listing.title)
      setMetaContent('meta[name="twitter:card"]', 'summary_large_image')
    }

    document.head.querySelector('link[rel="canonical"]')?.setAttribute('href', canonicalUrl)

    const structuredData = document.createElement('script')
    structuredData.id = 'yazoo-listing-structured-data'
    structuredData.type = 'application/ld+json'
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemPage',
      name: listing.title,
      description,
      url: canonicalUrl,
      mainEntity: buildListingStructuredEntity(section, listing, description, canonicalUrl),
    })
    document.getElementById('yazoo-listing-structured-data')?.remove()
    document.head.append(structuredData)

    return () => {
      structuredData.remove()
    }
  }, [definition, listing, listingId, section, t])

  useEffect(() => {
    if (!notFound) {
      return
    }

    document.title = `${t('publicMarketplace.notFoundTitle')} | YaZoo`
    setMetaContent('meta[name="robots"]', 'noindex, nofollow')
    document.getElementById('yazoo-listing-structured-data')?.remove()
  }, [notFound, t])

  if (!definition || !hasValidId) {
    return <Navigate to="/" replace />
  }

  const badgeKey = getBadgeTranslationKey(listing?.badge)
  const professionalBadgeKey = getBadgeTranslationKey(listing?.professionalBadge)

  return (
    <PublicMarketplaceShell>
      <Link
        to={getPublicMarketplaceSectionPath(section)}
        className="mb-4 inline-flex rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-50 dark:border-violet-300/16 dark:bg-white/8 dark:text-violet-100"
      >
        {t('publicMarketplace.backToCategory')}
      </Link>

      {isLoading ? <DetailSkeleton /> : null}

      {!isLoading && notFound ? (
        <DetailState
          title={t('publicMarketplace.notFoundTitle')}
          body={t('publicMarketplace.notFoundDescription')}
        />
      ) : null}

      {!isLoading && hasError ? (
        <DetailState
          title={t('publicMarketplace.loadErrorTitle')}
          body={t('publicMarketplace.loadError')}
        >
          <button
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
            className="mt-5 rounded-full bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white"
          >
            {t('landing.marketplaceRetry')}
          </button>
        </DetailState>
      ) : null}

      {!isLoading && listing ? (
        <article className="overflow-hidden rounded-[32px] border border-white/80 bg-white/92 shadow-[0_28px_70px_rgba(124,58,237,0.1)] dark:border-violet-300/14 dark:bg-white/8">
          <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
            <div className="min-h-72 bg-violet-50 dark:bg-white/6 lg:min-h-[34rem]">
              {listing.imageUrl ? (
                <img
                  src={listing.imageUrl}
                  alt={listing.title}
                  className="h-full max-h-[42rem] w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-72 items-center justify-center px-8 text-center text-violet-500 dark:text-violet-200/65">
                  {t('landing.marketplaceImageMissing')}
                </div>
              )}
            </div>

            <div className="flex flex-col p-5 sm:p-7 lg:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
                {t(definition.titleKey)}
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-stone-950 dark:text-violet-50 sm:text-4xl">
                {listing.title}
              </h1>
              {listing.subtitle ? (
                <p className="mt-2 text-sm text-stone-500 dark:text-violet-100/65">
                  {listing.subtitle}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {professionalBadgeKey ? (
                  <DetailBadge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-400/18 dark:text-emerald-100">
                    {t(professionalBadgeKey)}
                  </DetailBadge>
                ) : null}
                {badgeKey ? (
                  <DetailBadge className="bg-violet-100 text-violet-800 dark:bg-violet-400/18 dark:text-violet-100">
                    {t(badgeKey)}
                  </DetailBadge>
                ) : null}
              </div>

              {listing.price !== null ? (
                <p className="mt-5 text-2xl font-semibold text-violet-700 dark:text-violet-300">
                  {formatListingPrice(listing.price, locale)}
                </p>
              ) : null}

              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                {listing.location ? (
                  <DetailFact
                    label={t('publicMarketplace.location')}
                    value={listing.location}
                  />
                ) : null}
                {listing.createdAt ? (
                  <DetailFact
                    label={t('publicMarketplace.publishedAt')}
                    value={formatListingDate(listing.createdAt, locale)}
                  />
                ) : null}
              </dl>

              <section className="mt-6">
                <h2 className="text-lg font-semibold text-stone-950 dark:text-violet-50">
                  {t('publicMarketplace.descriptionTitle')}
                </h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-600 dark:text-violet-100/75 sm:text-base">
                  {listing.description || t('landing.marketplaceNoDescription')}
                </p>
              </section>

              <div className="mt-6 flex items-center gap-3 rounded-[22px] border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-300/14 dark:bg-white/7">
                <Avatar
                  name={listing.author?.name || t('common.user')}
                  src={listing.author?.avatar || ''}
                />
                <div className="min-w-0">
                  <p className="text-xs text-stone-500 dark:text-violet-100/60">
                    {t('publicMarketplace.publishedBy')}
                  </p>
                  <p className="truncate font-semibold text-stone-900 dark:text-violet-50">
                    {listing.author?.name || t('common.user')}
                  </p>
                </div>
              </div>

              <div className="mt-auto pt-6">
                <p className="rounded-[20px] border border-amber-200/70 bg-amber-50/85 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-300/18 dark:bg-amber-400/10 dark:text-amber-100">
                  {t('publicMarketplace.readOnlyNotice')}
                </p>
                <Link
                  to="/login"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,58,237,0.18)]"
                >
                  {t('publicMarketplace.signInToContact')}
                </Link>
              </div>
            </div>
          </div>
        </article>
      ) : null}
    </PublicMarketplaceShell>
  )
}

function setMetaContent(selector, content) {
  document.head.querySelector(selector)?.setAttribute('content', content)
}

function buildListingStructuredEntity(section, listing, description, canonicalUrl) {
  const common = {
    '@type': section === 'services' || section === 'veterinarians' ? 'Service' : 'Product',
    name: listing.title,
    description,
    url: canonicalUrl,
    ...(listing.imageUrl ? { image: listing.imageUrl } : {}),
  }

  if (listing.author?.name) {
    common.provider = {
      '@type': 'Person',
      name: listing.author.name,
    }
  }

  if (listing.price !== null && listing.price !== undefined) {
    common.offers = {
      '@type': 'Offer',
      price: Number(listing.price),
      priceCurrency: 'MAD',
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
    }
  }

  return common
}

function DetailBadge({ children, className }) {
  return (
    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  )
}

function DetailFact({ label, value }) {
  return (
    <div className="rounded-[18px] border border-violet-100 bg-violet-50/65 p-3 dark:border-violet-300/12 dark:bg-white/6">
      <dt className="text-xs text-stone-500 dark:text-violet-100/55">{label}</dt>
      <dd className="mt-1 font-semibold text-stone-900 dark:text-violet-50">{value}</dd>
    </div>
  )
}

function DetailState({ body, children, title }) {
  return (
    <section className="rounded-[30px] border border-white/80 bg-white/90 px-5 py-16 text-center shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/14 dark:bg-white/8">
      <h1 className="text-3xl font-semibold text-stone-950 dark:text-violet-50">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-stone-600 dark:text-violet-100/72">
        {body}
      </p>
      {children}
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid overflow-hidden rounded-[32px] border border-white/80 bg-white/90 dark:border-violet-300/14 dark:bg-white/8 lg:grid-cols-2"
    >
      <div className="min-h-80 animate-pulse bg-violet-100 dark:bg-violet-300/12" />
      <div className="space-y-5 p-7">
        <div className="h-4 w-1/4 animate-pulse rounded-full bg-violet-100" />
        <div className="h-10 w-3/4 animate-pulse rounded-full bg-violet-100" />
        <div className="h-28 animate-pulse rounded-[22px] bg-violet-50" />
      </div>
    </div>
  )
}

export default PublicListingPage
