import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { getPublicMarketplacePreviewRequest } from '../../api/publicMarketplace'
import { useI18n } from '../../hooks/useI18n'
import PublicListingCard from './PublicListingCard'
import {
  PUBLIC_MARKETPLACE_SECTIONS,
  getPublicMarketplaceSectionPath,
} from './publicMarketplaceConfig'

const EMPTY_SECTIONS = {
  animals: [],
  products: [],
  services: [],
  veterinarians: [],
}

function PublicMarketplaceShowcase() {
  const { isRtl, locale, t } = useI18n()
  const [sections, setSections] = useState(EMPTY_SECTIONS)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadPreview = async () => {
      setIsLoading(true)

      try {
        const response = await getPublicMarketplacePreviewRequest()

        if (!cancelled) {
          setSections({
            ...EMPTY_SECTIONS,
            ...(response.data?.data ?? {}),
          })
          setHasError(false)
        }
      } catch {
        if (!cancelled) {
          setHasError(true)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadPreview()

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return (
    <section
      id="marketplace-preview"
      aria-labelledby="marketplace-preview-title"
      aria-busy={isLoading}
      className="mt-8 min-w-0 max-w-full overflow-hidden rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_60px_rgba(124,58,237,0.08)] backdrop-blur dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.92))] sm:rounded-[34px] sm:p-7 lg:p-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
            {t('common.marketplace')}
          </p>
          <h2
            id="marketplace-preview-title"
            className="mt-2 text-2xl font-semibold text-stone-950 dark:text-white sm:text-3xl"
          >
            {t('landing.marketplaceTitle')}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600 dark:text-violet-100/76 sm:text-base">
            {t('landing.marketplaceDescription')}
          </p>
        </div>
        <Link
          to="/register"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,58,237,0.18)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
        >
          {t('landing.marketplacePublish')}
        </Link>
      </div>

      {hasError ? (
        <div
          className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-300/20 dark:bg-amber-500/12 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p>{t('landing.marketplaceLoadError')}</p>
          <button
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
            className="shrink-0 rounded-full border border-amber-300/70 bg-white px-4 py-2 font-semibold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-200/25 dark:bg-white/10 dark:text-amber-50 dark:hover:bg-white/15"
          >
            {t('landing.marketplaceRetry')}
          </button>
        </div>
      ) : (
        <div className="mt-7 min-w-0 space-y-8">
          {PUBLIC_MARKETPLACE_SECTIONS.map((definition) => (
            <PreviewRow
              key={definition.key}
              title={t(definition.titleKey)}
              section={definition.key}
              listings={sections[definition.key]}
              isLoading={isLoading}
              isRtl={isRtl}
              locale={locale}
              t={t}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function PreviewRow({ title, section, listings, isLoading, isRtl, locale, t }) {
  const scrollerRef = useRef(null)
  const hasListings = listings.length > 0

  const scroll = (direction) => {
    const amount = Math.max(scrollerRef.current?.clientWidth ?? 320, 320) * 0.82
    const rtlFactor = isRtl ? -1 : 1

    scrollerRef.current?.scrollBy({
      left: direction * amount * rtlFactor,
      behavior: 'smooth',
    })
  }

  return (
    <div className="min-w-0">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-stone-900 dark:text-violet-50 sm:text-xl">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <Link
            to={getPublicMarketplaceSectionPath(section)}
            className="me-1 hidden text-sm font-semibold text-violet-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:inline"
          >
            {t('publicMarketplace.viewAll')}
          </Link>
          <ScrollButton
            label={t('landing.marketplacePrevious')}
            onClick={() => scroll(-1)}
            disabled={isLoading || !hasListings}
          >
            {isRtl ? '→' : '←'}
          </ScrollButton>
          <ScrollButton
            label={t('landing.marketplaceNext')}
            onClick={() => scroll(1)}
            disabled={isLoading || !hasListings}
          >
            {isRtl ? '←' : '→'}
          </ScrollButton>
        </div>
      </div>

      {isLoading || hasListings ? (
        <div
          ref={scrollerRef}
          aria-label={title}
          className="flex max-w-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:thin]"
        >
          {isLoading
            ? Array.from({ length: 4 }, (_, index) => <PreviewSkeleton key={index} />)
            : listings.map((listing) => (
                <div
                  key={`${listing.type}-${listing.id}`}
                  className="w-[82vw] max-w-[310px] shrink-0 snap-start sm:w-[285px]"
                >
                  <PublicListingCard
                    listing={listing}
                    locale={locale}
                    section={section}
                    t={t}
                  />
                </div>
              ))}
        </div>
      ) : (
        <p className="rounded-[22px] border border-dashed border-violet-200 bg-violet-50/65 px-5 py-7 text-center text-sm text-stone-600 dark:border-violet-300/18 dark:bg-white/6 dark:text-violet-100/70">
          {t('landing.marketplaceSectionEmpty')}
        </p>
      )}

      <Link
        to={getPublicMarketplaceSectionPath(section)}
        className="mt-3 inline-flex text-sm font-semibold text-violet-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:hidden"
      >
        {t('publicMarketplace.viewAll')}
      </Link>
    </div>
  )
}

function ScrollButton({ children, disabled, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-violet-100 bg-white text-violet-800 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-45 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-100 dark:hover:bg-white/14"
    >
      {children}
    </button>
  )
}

function PreviewSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="w-[82vw] max-w-[310px] shrink-0 snap-start overflow-hidden rounded-[24px] border border-violet-100 bg-white dark:border-violet-300/14 dark:bg-white/8 sm:w-[285px]"
    >
      <div className="h-44 animate-pulse bg-violet-100 dark:bg-violet-300/12" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-violet-100 dark:bg-violet-300/12" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-violet-50 dark:bg-violet-300/8" />
        <div className="h-10 animate-pulse rounded-2xl bg-violet-50 dark:bg-violet-300/8" />
      </div>
    </div>
  )
}

export default PublicMarketplaceShowcase
