import { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'

import { I18nContext } from './i18n-context'
import {
  SUPPORTED_LOCALES,
  getCurrentLocale,
  getDirection,
  setStoredLocale,
  translate,
} from '../lib/i18n'

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => globalThis.location?.pathname.match(/^\/(fr|en|ar)\/?$/)?.[1] || getCurrentLocale())

  useEffect(() => {
    const synchronizePathLocale = () => {
      const pathLocale = globalThis.location?.pathname.match(/^\/(fr|en|ar)\/?$/)?.[1]
      if (pathLocale) setLocaleState(pathLocale)
    }
    globalThis.addEventListener('popstate', synchronizePathLocale)
    return () => globalThis.removeEventListener('popstate', synchronizePathLocale)
  }, [])

  useEffect(() => {
    const nextDirection = getDirection(locale)
    document.documentElement.lang = locale
    document.documentElement.dir = nextDirection
    document.documentElement.classList.toggle('rtl', nextDirection === 'rtl')
    document.documentElement.classList.toggle('ltr', nextDirection === 'ltr')
    document.body.dir = nextDirection
  }, [locale])

  const setLocale = useCallback((nextLocale) => {
    if (SUPPORTED_LOCALES.includes(nextLocale)) {
      const pathLocale = globalThis.location?.pathname.match(/^\/(fr|en|ar)\/?$/)?.[1]
      if (pathLocale && pathLocale !== nextLocale) {
        setStoredLocale(nextLocale)
        globalThis.location.assign(`/${nextLocale}${globalThis.location.search}${globalThis.location.hash}`)
        return
      }
      setStoredLocale(nextLocale)
      setLocaleState(nextLocale)
    }
  }, [])

  const value = useMemo(
    () => ({
      locale,
      dir: getDirection(locale),
      isRtl: locale === 'ar',
      setLocale,
      t: (key, replacements = {}) => translate(locale, key, replacements),
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

I18nProvider.propTypes = {
  children: PropTypes.node,
}
