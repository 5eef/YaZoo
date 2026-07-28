import { useContext } from 'react'
import { Link } from 'react-router'

import { I18nContext } from '../../contexts/i18n-context'
import { getCurrentLocale, translate } from '../../lib/i18n'

function Footer({ className = '' }) {
  const i18n = useContext(I18nContext)
  const t = i18n?.t ?? ((key, replacements) => translate(getCurrentLocale(), key, replacements))
  const links = [
    { to: '/cgu', label: t('footer.terms') },
    { to: '/privacy', label: t('footer.privacy') },
    { to: '/rules', label: t('footer.rules') },
    { to: '/about', label: t('footer.about') },
    { to: '/impact', label: t('footer.impact') },
    { to: '/partner', label: t('footer.partner') },
    { to: '/pros', label: t('footer.pros') },
    { to: '/demo-mobile', label: t('footer.mobileDemo') },
    { to: '/accessibility', label: t('footer.accessibility') },
  ]

  return (
    <footer
      className={`rounded-[28px] border border-white/80 bg-white/92 px-4 py-4 shadow-[0_18px_40px_rgba(124,58,237,0.08)] backdrop-blur dark:border-violet-300/14 dark:bg-white/8 dark:shadow-[0_24px_70px_rgba(0,0,0,0.24)] ${className}`}
    >
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <nav className="flex max-w-full flex-wrap items-center justify-center gap-2 text-xs font-semibold">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-full border border-violet-100 bg-violet-50/70 px-3 py-1.5 text-violet-800 transition hover:bg-violet-100 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-100 dark:hover:bg-white/12"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/contact"
          className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(124,58,237,0.16)] transition hover:brightness-105 sm:w-auto"
        >
          {t('footer.contactUs')}
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs leading-6 text-stone-500 dark:text-violet-100/70">
          <img
            src="/yazoo-logo.svg"
            alt=""
            className="h-6 w-6 object-contain"
            aria-hidden="true"
          />
          <p>
            <span className="yz-wordmark text-xs font-semibold">YaZoo</span>
            {' © 2026 - '}
            {t('footer.platformDescription')}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
