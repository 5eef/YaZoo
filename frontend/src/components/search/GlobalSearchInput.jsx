import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import PropTypes from 'prop-types'

import { searchUsersRequest } from '../../api/search'
import { useI18n } from '../../hooks/useI18n'
import Avatar from '../ui/Avatar'

function GlobalSearchInput({ value, onChange, onSearch }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [hasError, setHasError] = useState(false)
  const wrapperRef = useRef(null)
  const trimmedValue = value.trim()
  const isShortSearchQuery = Boolean(trimmedValue) && trimmedValue.length < 2

  useEffect(() => {
    if (trimmedValue.length < 2) {
      setSuggestions([])
      setIsLoading(false)
      setHasError(false)
      return undefined
    }

    let cancelled = false
    const timeoutId = globalThis.setTimeout(async () => {
      setIsLoading(true)
      setHasError(false)

      try {
        const response = await searchUsersRequest(trimmedValue)

        if (!cancelled) {
          setSuggestions(Array.isArray(response.data.data) ? response.data.data : [])
          setIsOpen(true)
          setActiveIndex(-1)
        }
      } catch {
        if (!cancelled) {
          setSuggestions([])
          setHasError(true)
          setIsOpen(true)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      globalThis.clearTimeout(timeoutId)
    }
  }, [trimmedValue])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setIsOpen(false)
    }

    globalThis.addEventListener('pointerdown', handlePointerDown)
    return () => globalThis.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const openSuggestion = (suggestion) => {
    if (!suggestion?.url) return

    setIsOpen(false)
    onChange('')
    navigate(suggestion.url)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, -1))
    } else if (event.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault()
      openSuggestion(suggestions[activeIndex])
    }
  }

  return (
    <label className="relative block" ref={wrapperRef}>
      <span className="sr-only">{t('common.search')}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={t('search.placeholder')}
        className="w-full rounded-full border border-white/55 bg-white/70 px-4 py-2 text-sm text-stone-700 outline-none transition focus:border-violet-300 focus:bg-white dark:border-violet-300/14 dark:bg-white/10 dark:text-violet-50 dark:placeholder:text-violet-100/45 dark:focus:bg-white/14"
      />
      {isOpen && trimmedValue.length >= 2 ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-[24px] border border-white/70 bg-white/95 p-2 shadow-[0_24px_60px_rgba(76,29,149,0.18)] backdrop-blur-2xl dark:border-violet-300/16 dark:bg-[#160d24]/95">
          {isLoading ? <SearchState>{t('search.searching')}</SearchState> : null}
          {!isLoading && hasError ? <SearchState>{t('search.error')}</SearchState> : null}
          {!isLoading && !hasError && suggestions.length === 0 ? (
            <SearchState>{t('search.noUsers')}</SearchState>
          ) : null}
          {!isLoading && suggestions.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => openSuggestion(suggestion)}
                  className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-start transition ${
                    index === activeIndex
                      ? 'bg-violet-100 text-violet-950 dark:bg-violet-500/24 dark:text-white'
                      : 'text-stone-700 hover:bg-violet-50 dark:text-violet-50 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                  aria-label={t('search.viewProfile')}
                >
                  <Avatar
                    name={suggestion.name ?? t('common.user')}
                    src={suggestion.avatarUrl || ''}
                    className="h-10 w-10 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{suggestion.name}</span>
                    <span className="block truncate text-xs text-stone-500 dark:text-violet-100/65">
                      @{suggestion.username ?? suggestion.id}
                      {suggestion.city ? ` - ${suggestion.city}` : ''}
                    </span>
                  </span>
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/24 dark:text-violet-100">
                    {t('search.userType')}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSearch(trimmedValue)}
            className="mt-2 w-full rounded-[18px] border border-violet-100 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-300/18 dark:bg-violet-500/20 dark:text-violet-50"
          >
            {t('search.viewAll')}
          </button>
        </div>
      ) : null}
      {isOpen && isShortSearchQuery ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 rounded-[22px] border border-white/70 bg-white/95 px-4 py-3 text-sm text-stone-500 shadow-[0_18px_42px_rgba(76,29,149,0.14)] dark:border-violet-300/16 dark:bg-[#160d24]/95 dark:text-violet-100/70">
          {t('search.minChars')}
        </div>
      ) : null}
    </label>
  )
}

function SearchState({ children }) {
  return <div className="px-3 py-4 text-center text-sm text-stone-500 dark:text-violet-100/70">{children}</div>
}

GlobalSearchInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  onSearch: PropTypes.func,
}

SearchState.propTypes = {
  children: PropTypes.node,
}

export default GlobalSearchInput
