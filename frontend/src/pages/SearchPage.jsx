import { createElement, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import PropTypes from 'prop-types'

import { globalSearchRequest } from '../api/search'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { useI18n } from '../hooks/useI18n'

const SEARCH_TABS = ['all', 'users', 'communities', 'animals', 'products', 'posts', 'services', 'veterinarians']

const emptyResults = {
  users: [],
  communities: [],
  animals: [],
  products: [],
  posts: [],
  services: [],
  veterinarians: [],
}

function SearchPage() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('q') ?? ''
  const tabFromUrl = searchParams.get('type') ?? 'all'
  const [query, setQuery] = useState(queryFromUrl)
  const [activeTab, setActiveTab] = useState(SEARCH_TABS.includes(tabFromUrl) ? tabFromUrl : 'all')
  const [results, setResults] = useState(emptyResults)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const trimmedQuery = queryFromUrl.trim()
  const isShortQuery = Boolean(trimmedQuery) && trimmedQuery.length < 2
  const hasSearchQuery = trimmedQuery.length >= 2
  const totalResults = useMemo(
    () => Object.values(results).reduce((sum, items) => sum + items.length, 0),
    [results],
  )

  useEffect(() => {
    setQuery(queryFromUrl)
    setActiveTab(SEARCH_TABS.includes(tabFromUrl) ? tabFromUrl : 'all')
  }, [queryFromUrl, tabFromUrl])

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setResults(emptyResults)
      setErrorMessage('')
      return undefined
    }

    let cancelled = false

    const fetchResults = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await globalSearchRequest(trimmedQuery, activeTab)

        if (!cancelled) {
          setResults({
            ...emptyResults,
            ...(response.data.data ?? {}),
          })
        }
      } catch {
        if (!cancelled) {
          setResults(emptyResults)
          setErrorMessage(t('search.error'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchResults()

    return () => {
      cancelled = true
    }
  }, [activeTab, t, trimmedQuery])

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextQuery = query.trim()

    if (!nextQuery) {
      setSearchParams({})
      return
    }

    setSearchParams(activeTab === 'all' ? { q: nextQuery } : { q: nextQuery, type: activeTab })
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)

    if (trimmedQuery) {
      setSearchParams(tab === 'all' ? { q: trimmedQuery } : { q: trimmedQuery, type: tab })
    }
  }

  return (
    <section className="space-y-6">
      <section className="rounded-[30px] border border-white/80 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_30%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(247,241,255,0.86))] p-5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/14 dark:bg-[linear-gradient(135deg,_rgba(24,16,38,0.86),_rgba(49,24,83,0.48))] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
          {t('search.badge')}
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-stone-950 dark:text-violet-50 sm:text-3xl">
          {t('search.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600 dark:text-violet-100/75">
          {t('search.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search.placeholder')}
            className="min-w-0 flex-1 rounded-[22px] border border-violet-100 bg-white/88 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-300 dark:border-violet-300/14 dark:bg-white/10 dark:text-violet-50"
          />
          <Button type="submit" className="w-full md:w-auto">
            {t('common.search')}
          </Button>
        </form>
      </section>

      <nav className="overflow-x-auto rounded-[24px] border border-white/70 bg-white/70 p-2 shadow-[0_16px_34px_rgba(124,58,237,0.08)] dark:border-violet-300/12 dark:bg-white/8">
        <div className="flex min-w-max gap-2">
          {SEARCH_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? 'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_12px_24px_rgba(124,58,237,0.18)]'
                  : 'text-stone-600 hover:bg-violet-50 hover:text-violet-900 dark:text-violet-100/75 dark:hover:bg-white/10'
              }`}
            >
              {t(`search.tabs.${tab}`)}
            </button>
          ))}
        </div>
      </nav>

      {isShortQuery ? (
        <StateBox>{t('search.minChars')}</StateBox>
      ) : null}

      {isLoading ? <StateBox>{t('search.searching')}</StateBox> : null}
      {errorMessage ? <StateBox>{errorMessage}</StateBox> : null}
      {!isLoading && hasSearchQuery && totalResults === 0 && !errorMessage ? (
        <StateBox>{t('search.noResults')}</StateBox>
      ) : null}

      {!isLoading && totalResults > 0 ? (
        <div className="space-y-5">
          {renderSection('users', results.users, activeTab, t, UserResultCard)}
          {renderSection('communities', results.communities, activeTab, t, GenericResultCard)}
          {renderSection('animals', results.animals, activeTab, t, GenericResultCard)}
          {renderSection('products', results.products, activeTab, t, GenericResultCard)}
          {renderSection('posts', results.posts, activeTab, t, PostResultCard)}
          {renderSection('services', results.services, activeTab, t, GenericResultCard)}
          {renderSection('veterinarians', results.veterinarians, activeTab, t, GenericResultCard)}
        </div>
      ) : null}
    </section>
  )
}

function PostResultCard({ item, t }) {
  return (
    <Link
      to={item.url}
      className="flex min-w-0 gap-3 rounded-[26px] border border-white/80 bg-white/86 p-4 text-start shadow-[0_18px_40px_rgba(124,58,237,0.08)] transition hover:-translate-y-0.5 hover:border-violet-200 dark:border-violet-300/12 dark:bg-white/8"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[20px] bg-violet-100 dark:bg-violet-500/20">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-bold text-violet-700 dark:text-violet-100">
            {(item.author?.name ?? item.name ?? '?').charAt(0)}
          </div>
        )}
      </div>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-stone-950 dark:text-violet-50">{item.name}</span>
        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-stone-500 dark:text-violet-100/65">
          {item.description || t('post.shareFallback')}
        </span>
        <span className="mt-2 block truncate text-xs text-violet-700 dark:text-violet-200">
          {item.author?.name ?? t('common.user')}
          {item.city ? ` - ${item.city}` : ''}
        </span>
      </span>
    </Link>
  )
}

function renderSection(key, items, activeTab, t, Card) {
  if (activeTab !== 'all' && activeTab !== key) {
    return null
  }

  if (!items.length) {
    return null
  }

  return (
    <section key={key} className="space-y-3">
      <h2 className="text-lg font-semibold text-stone-950 dark:text-violet-50">
        {t(`search.tabs.${key}`)}
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => createElement(Card, { key: `${key}-${item.id}`, item, t }))}
      </div>
    </section>
  )
}

function UserResultCard({ item, t }) {
  return (
    <Link
      to={item.url}
      className="flex min-w-0 items-center gap-3 rounded-[26px] border border-white/80 bg-white/86 p-4 text-start shadow-[0_18px_40px_rgba(124,58,237,0.08)] transition hover:-translate-y-0.5 hover:border-violet-200 dark:border-violet-300/12 dark:bg-white/8"
    >
      <Avatar name={item.name ?? t('common.user')} src={item.avatarUrl || ''} className="h-12 w-12 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-stone-950 dark:text-violet-50">{item.name}</span>
        <span className="block truncate text-xs text-stone-500 dark:text-violet-100/65">
          @{item.username ?? item.id}
          {item.city ? ` - ${item.city}` : ''}
        </span>
      </span>
    </Link>
  )
}

function GenericResultCard({ item, t }) {
  return (
    <Link
      to={item.url}
      className="flex min-w-0 gap-3 rounded-[26px] border border-white/80 bg-white/86 p-4 text-start shadow-[0_18px_40px_rgba(124,58,237,0.08)] transition hover:-translate-y-0.5 hover:border-violet-200 dark:border-violet-300/12 dark:bg-white/8"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[20px] bg-violet-100 dark:bg-violet-500/20">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-bold text-violet-700">
            {(item.name ?? '?').charAt(0)}
          </div>
        )}
      </div>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-stone-950 dark:text-violet-50">{item.name}</span>
        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-stone-500 dark:text-violet-100/65">
          {item.clinicName || item.description || item.city || t('search.result')}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-violet-700 dark:text-violet-200">
          {item.city ? <span>{item.city}</span> : null}
          {item.price !== null && item.price !== undefined ? <span dir="ltr">{item.price} MAD</span> : null}
          {item.isForAdoption ? <span>{t('marketplace.adoption')}</span> : null}
        </span>
      </span>
    </Link>
  )
}

function StateBox({ children }) {
  return (
    <div className="rounded-[26px] border border-dashed border-violet-200 bg-white/72 px-4 py-12 text-center text-sm text-stone-500 dark:border-violet-300/20 dark:bg-white/8 dark:text-violet-100/70">
      {children}
    </div>
  )
}

UserResultCard.propTypes = {
  item: PropTypes.object,
  t: PropTypes.func,
}

GenericResultCard.propTypes = {
  item: PropTypes.object,
  t: PropTypes.func,
}

PostResultCard.propTypes = {
  item: PropTypes.object,
  t: PropTypes.func,
}

StateBox.propTypes = {
  children: PropTypes.node,
}

export default SearchPage
