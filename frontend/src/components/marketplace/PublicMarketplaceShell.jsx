import PropTypes from 'prop-types'
import { Link, NavLink } from 'react-router'

import { useI18n } from '../../hooks/useI18n'
import Footer from '../ui/Footer'
import {
  PUBLIC_MARKETPLACE_SECTIONS,
  getPublicMarketplaceSectionPath,
} from './publicMarketplaceConfig'

function PublicMarketplaceShell({ children }) {
  const { t } = useI18n()

  return (
    <div className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_24%),linear-gradient(180deg,_#fffaff_0%,_#f7f1ff_100%)] px-4 py-4 text-start transition-colors dark:bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.24),_transparent_28%),linear-gradient(180deg,_#08050d_0%,_#160827_100%)] sm:px-6">
      <a href="#main-content" className="yz-skip-link">
        {t('accessibility.skipToContent')}
      </a>
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col">
        <header className="rounded-[26px] border border-white/70 bg-white/82 px-4 py-3 shadow-[0_18px_42px_rgba(124,58,237,0.08)] backdrop-blur-xl dark:border-violet-300/14 dark:bg-white/8 lg:px-5 lg:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-3">
              <img src="/yazoo-logo.svg" alt="" className="h-11 w-11 object-contain" />
              <span className="yz-wordmark text-base">YaZoo</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-50 dark:border-violet-300/18 dark:bg-white/8 dark:text-violet-50"
              >
                {t('common.login')}
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(124,58,237,0.18)]"
              >
                {t('landing.marketplacePublish')}
              </Link>
            </div>
          </div>

          <nav
            aria-label={t('publicMarketplace.categoriesLabel')}
            className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
          >
            {PUBLIC_MARKETPLACE_SECTIONS.map((section) => (
              <NavLink
                key={section.key}
                to={getPublicMarketplaceSectionPath(section.key)}
                className={({ isActive }) =>
                  `shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-violet-700 text-white shadow-[0_10px_22px_rgba(124,58,237,0.18)]'
                      : 'border border-violet-100 bg-violet-50/80 text-violet-800 hover:bg-violet-100 dark:border-violet-300/14 dark:bg-white/8 dark:text-violet-100'
                  }`
                }
              >
                {t(section.titleKey)}
              </NavLink>
            ))}
          </nav>
        </header>

        <main id="main-content" className="flex-1 py-6">
          {children}
        </main>

        <Footer className="mt-auto" />
      </div>
    </div>
  )
}

PublicMarketplaceShell.propTypes = {
  children: PropTypes.node,
}

export default PublicMarketplaceShell
