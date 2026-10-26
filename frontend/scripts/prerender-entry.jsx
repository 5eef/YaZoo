import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { AuthContext } from '../src/contexts/auth-context'
import { I18nContext } from '../src/contexts/i18n-context'
import { translate } from '../src/lib/i18n'
import LandingPage from '../src/pages/LandingPage'
import AboutPage from '../src/pages/AboutPage'
import ProsPage from '../src/pages/ProsPage'
import PartnerPage from '../src/pages/PartnerPage'

const pages = { '/': LandingPage, '/about': AboutPage, '/pros': ProsPage, '/partner': PartnerPage }

export function prerender(pathname, locale = 'fr') {
  const Page = pages[pathname]
  if (!Page) return ''
  const direction = locale === 'ar' ? 'rtl' : 'ltr'
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[pathname]}>
      <I18nContext.Provider value={{ locale, dir: direction, isRtl: locale === 'ar', setLocale() {}, t: (key) => translate(locale, key) }}>
        <AuthContext.Provider value={{ isAuthenticated: false }}>
          <Page includeLivePreview={false} />
        </AuthContext.Provider>
      </I18nContext.Provider>
    </MemoryRouter>,
  )
}
