import PropTypes from 'prop-types'
import { Link } from 'react-router'

import Footer from './Footer'
import LegalConfigurationSummary from '../legal/LegalConfigurationSummary'
import { useI18n } from '../../hooks/useI18n'

function PublicPageShell({ titleKey, eyebrowKey, introKey, sections = [], ctaKey = 'publicPages.contactCta' }) {
  const { t } = useI18n()

  return (
    <div className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_24%),linear-gradient(180deg,_#fffaff_0%,_#f7f1ff_100%)] px-4 py-4 text-start transition-colors dark:bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.24),_transparent_28%),linear-gradient(180deg,_#08050d_0%,_#160827_100%)] sm:px-6">
      <a href="#main-content" className="yz-skip-link">
        {t('accessibility.skipToContent')}
      </a>
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-white/70 bg-white/82 px-4 py-3 shadow-[0_18px_42px_rgba(124,58,237,0.08)] backdrop-blur-xl dark:border-violet-300/14 dark:bg-white/8 lg:px-5 lg:py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/yazoo-logo.webp" alt="" className="h-11 w-11 object-contain" />
            <span className="yz-wordmark text-base">YaZoo</span>
          </Link>
          <Link
            to="/contact"
            className="inline-flex rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(124,58,237,0.18)] lg:px-5 lg:py-2.5 lg:text-base"
          >
            {t('footer.contactUs')}
          </Link>
        </header>

        <main id="main-content" className="flex-1 py-6">
          <section className="rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] dark:border-violet-300/14 dark:bg-white/8 sm:p-7 lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
              {t(eyebrowKey)}
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-stone-950 dark:text-violet-50 sm:text-4xl xl:text-5xl">
              {t(titleKey)}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-650 dark:text-violet-100/78 lg:text-base xl:text-[17px] xl:leading-8">
              {t(introKey)}
            </p>
          </section>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:gap-5">
            {sections.map((section) => (
              <article
                key={section.titleKey}
                className="rounded-[26px] border border-white/76 bg-white/86 p-5 shadow-[0_18px_40px_rgba(124,58,237,0.08)] dark:border-violet-300/12 dark:bg-white/8 lg:p-6"
              >
                <h2 className="text-lg font-semibold text-stone-950 dark:text-violet-50 lg:text-xl">
                  {t(section.titleKey)}
                </h2>
                <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-violet-100/75 lg:text-base">
                  {t(section.bodyKey)}
                </p>
              </article>
            ))}
          </div>

          <LegalConfigurationSummary />

          <section className="mt-5 rounded-[26px] border border-amber-200/70 bg-amber-50/86 p-5 text-sm leading-7 text-amber-950 shadow-[0_18px_40px_rgba(245,158,11,0.08)] dark:border-amber-300/18 dark:bg-amber-400/10 dark:text-amber-100 lg:text-base">
            {t('publicPages.intermediationNotice')}
          </section>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/rules"
              className="inline-flex rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 dark:bg-white/10 dark:text-violet-50 lg:px-5 lg:py-2.5 lg:text-base"
            >
              {t('footer.rules')}
            </Link>
            <Link
              to="/contact"
              className="inline-flex rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] px-4 py-2 text-sm font-semibold text-white lg:px-5 lg:py-2.5 lg:text-base"
            >
              {t(ctaKey)}
            </Link>
          </div>
        </main>

        <Footer className="mt-auto" />
      </div>
    </div>
  )
}

PublicPageShell.propTypes = {
  titleKey: PropTypes.string.isRequired,
  eyebrowKey: PropTypes.string.isRequired,
  introKey: PropTypes.string.isRequired,
  sections: PropTypes.array,
  ctaKey: PropTypes.string,
}

export default PublicPageShell
