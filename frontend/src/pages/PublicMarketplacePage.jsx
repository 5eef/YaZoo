import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router'

import { getPublicMarketplaceSectionRequest } from '../api/publicMarketplace'
import PublicListingCard from '../components/marketplace/PublicListingCard'
import PublicMarketplaceShell from '../components/marketplace/PublicMarketplaceShell'
import {
  getPublicMarketplaceSection,
  isPublicMarketplaceSection,
} from '../components/marketplace/publicMarketplaceConfig'
import { useI18n } from '../hooks/useI18n'

const EMPTY_META = {
  currentPage: 1,
  lastPage: 1,
  perPage: 12,
  total: 0,
}

function PublicMarketplacePage() {
  const { section } = useParams()
  const { locale, t } = useI18n()
  const [page, setPage] = useState(1)
  const [listings, setListings] = useState([])
  const [meta, setMeta] = useState(EMPTY_META)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const definition = getPublicMarketplaceSection(section)

  useEffect(() => {
    setPage(1)
  }, [section])

  useEffect(() => {
    if (!isPublicMarketplaceSection(section)) {
      return undefined
    }

    let cancelled = false

    const loadListings = async () => {
      setIsLoading(true)

      try {
        const response = await getPublicMarketplaceSectionRequest(section, page)

        if (!cancelled) {
          setListings(response.data?.data ?? [])
          setMeta({
            ...EMPTY_META,
            ...(response.data?.meta ?? {}),
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

    loadListings()

    return () => {
      cancelled = true
    }
  }, [page, reloadKey, section])

  if (!definition) {
    return <Navigate to="/" replace />
  }

  return (
    <PublicMarketplaceShell>
      <section className="rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/14 dark:bg-white/8 sm:p-7 lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
          {t('publicMarketplace.eyebrow')}
        </p>
        <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight text-stone-950 dark:text-violet-50 sm:text-4xl xl:text-5xl">
          {t(definition.pageTitleKey)}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600 dark:text-violet-100/76 sm:text-base">
          {t(definition.descriptionKey)}
        </p>
        <p className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-300/16 dark:bg-emerald-400/10 dark:text-emerald-100">
          {t('publicMarketplace.approvedOnly')}
        </p>
      </section>

      <section
        aria-busy={isLoading}
        className="mt-5 rounded-[30px] border border-white/76 bg-white/72 p-4 shadow-[0_20px_50px_rgba(124,58,237,0.07)] dark:border-violet-300/12 dark:bg-white/6 sm:p-6"
      >
        {hasError ? (
          <MarketplaceState>
            <p>{t('publicMarketplace.loadError')}</p>
            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="mt-4 rounded-full bg-violet-700 px-5 py-2.5 font-semibold text-white"
            >
              {t('landing.marketplaceRetry')}
            </button>
          </MarketplaceState>
        ) : null}

        {!hasError && isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <ListingSkeleton key={index} />
            ))}
          </div>
        ) : null}

        {!hasError && !isLoading && listings.length === 0 ? (
          <MarketplaceState>{t('landing.marketplaceSectionEmpty')}</MarketplaceState>
        ) : null}

        {!hasError && !isLoading && listings.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <PublicListingCard
                  key={`${listing.type}-${listing.id}`}
                  listing={listing}
                  locale={locale}
                  section={section}
                  t={t}
                />
              ))}
            </div>
            <Pagination
              currentPage={meta.currentPage}
              lastPage={meta.lastPage}
              onPageChange={setPage}
              t={t}
            />
          </>
        ) : null}
      </section>
    </PublicMarketplaceShell>
  )
}

function Pagination({ currentPage, lastPage, onPageChange, t }) {
  if (lastPage <= 1) {
    return null
  }

  return (
    <nav
      aria-label={t('publicMarketplace.paginationLabel')}
      className="mt-6 flex items-center justify-center gap-3"
    >
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange((value) => Math.max(1, value - 1))}
        className="rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-800 disabled:cursor-not-allowed disabled:opacity-45 dark:border-violet-300/16 dark:bg-white/8 dark:text-violet-100"
      >
        {t('publicMarketplace.previousPage')}
      </button>
      <span className="text-sm font-semibold text-stone-600 dark:text-violet-100/75">
        {t('publicMarketplace.pageStatus', {
          current: currentPage,
          total: lastPage,
        })}
      </span>
      <button
        type="button"
        disabled={currentPage >= lastPage}
        onClick={() => onPageChange((value) => Math.min(lastPage, value + 1))}
        className="rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-800 disabled:cursor-not-allowed disabled:opacity-45 dark:border-violet-300/16 dark:bg-white/8 dark:text-violet-100"
      >
        {t('publicMarketplace.nextPage')}
      </button>
    </nav>
  )
}

function MarketplaceState({ children }) {
  return (
    <div className="rounded-[24px] border border-dashed border-violet-200 bg-violet-50/65 px-5 py-12 text-center text-sm text-stone-600 dark:border-violet-300/18 dark:bg-white/6 dark:text-violet-100/70">
      {children}
    </div>
  )
}

function ListingSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-[24px] border border-violet-100 bg-white dark:border-violet-300/14 dark:bg-white/8"
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

export default PublicMarketplacePage
