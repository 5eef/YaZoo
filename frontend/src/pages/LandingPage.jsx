import { brand } from '../lib/brand'
import { features } from '../lib/features'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'

import companionImage from '../assets/images/companions-bond.webp'
import heroImage from '../assets/images/hero-bond.webp'
import PublicMarketplaceShowcase from '../components/marketplace/PublicMarketplaceShowcase'
import Footer from '../components/ui/Footer'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'

function LandingPage() {
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navItems = [
    { href: '#features', label: t('landing.navFeatures') },
    { href: '#professionnels', label: t('landing.navProfessionals') },
    { href: '#communaute', label: t('landing.navCommunity') },
    { href: '#aide', label: t('landing.navHelp') },
  ]
  const journeySteps = [
    { title: t('landing.stepFindTitle'), description: t('landing.stepFindText') },
    { title: t('landing.stepProfileTitle'), description: t('landing.stepProfileText') },
    { title: t('landing.stepBookTitle'), description: t('landing.stepBookText') },
    { title: t('landing.stepMessageTitle'), description: t('landing.stepMessageText') },
    { title: t('landing.stepReviewTitle'), description: t('landing.stepReviewText') },
  ]
  const professionalFeatures = [
    { title: t('landing.professionalProfileTitle'), description: t('landing.professionalProfileText') },
    { title: t('landing.professionalVerificationTitle'), description: t('landing.professionalVerificationText') },
    { title: t('landing.professionalVisibilityTitle'), description: t('landing.professionalVisibilityText') },
    { title: t('landing.professionalBookingTitle'), description: t('landing.professionalBookingText') },
    { title: t('landing.professionalContactTitle'), description: t('landing.professionalContactText') },
  ]
  const trustFeatures = [
    { title: t('landing.trustVerificationTitle'), description: t('landing.trustVerificationText') },
    { title: t('landing.trustModerationTitle'), description: t('landing.trustModerationText') },
    { title: t('landing.trustPrivacyTitle'), description: t('landing.trustPrivacyText') },
  ]

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)

    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileMenuOpen])

  if (isAuthenticated) {
    return <Navigate to={features.startupPilot ? "/marketplace/veterinarians" : "/feed"} replace />
  }

  return (
    <>
      <a href="#top" className="yz-skip-link">
        {t('accessibility.skipToContent')}
      </a>
      <main
        id="main-content"
        className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(244,208,255,0.22),_transparent_20%),linear-gradient(180deg,_#fffaff_0%,_#f6efff_100%)] px-3 py-4 transition-colors dark:bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.34),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(76,29,149,0.38),_transparent_24%),linear-gradient(180deg,_#05030a_0%,_#10091a_46%,_#1b1030_100%)] sm:px-4 sm:py-5"
      >
      <div className="w-full lg:px-6">
        <header className="sticky top-3 z-30 rounded-[26px] border border-white/55 bg-[linear-gradient(135deg,_rgba(255,255,255,0.52),_rgba(248,240,255,0.36),_rgba(255,255,255,0.28))] px-4 py-3.5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] backdrop-blur-2xl dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.96),_rgba(30,15,52,0.9))] sm:top-4 sm:rounded-[30px] sm:py-4 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <a href="#top" className="flex min-w-0 items-center gap-3">
              <img
                src="/yazoo-logo.webp"
                alt={t('landing.logoAlt')}
                className="h-12 w-12 object-contain sm:h-14 sm:w-14"
              />
              <div className="min-w-0">
                <p className="yz-wordmark text-base">{brand.name}</p>
                <p className="max-w-[16rem] text-xs leading-5 text-stone-700 dark:text-violet-100/80 sm:max-w-none">
                  {t('common.tagline')}
                </p>
              </div>
            </a>

            <nav className="hidden items-center gap-1 rounded-full border border-white/45 bg-white/28 px-2 py-2 shadow-[0_16px_36px_rgba(124,58,237,0.08)] backdrop-blur-xl dark:border-violet-300/14 dark:bg-black/30 lg:flex">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-white/46 hover:text-violet-800 dark:text-violet-50 dark:hover:bg-violet-400/15 dark:hover:text-white xl:px-4 xl:py-2.5"
                >
                  {item.label}
                </a>
              ))}
              <Link
                to="/login"
                className="rounded-full px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-white/46 hover:text-violet-800 dark:text-violet-50 dark:hover:bg-violet-400/15 dark:hover:text-white xl:px-4 xl:py-2.5"
              >
                {t('common.login')}
              </Link>
            </nav>

            <div className="hidden shrink-0 lg:block">
              <LanguageSwitcher compact />
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/50 bg-white/30 text-stone-700 shadow-[0_12px_26px_rgba(124,58,237,0.08)] backdrop-blur-xl transition hover:border-white/70 hover:bg-white/46 hover:text-violet-800 dark:border-violet-300/16 dark:bg-black/35 dark:text-white dark:hover:bg-violet-400/18 lg:hidden"
              aria-label={isMobileMenuOpen ? t('layout.menuClose') : t('layout.menuOpen')}
              aria-expanded={isMobileMenuOpen}
              aria-controls="landing-mobile-menu"
            >
              <BurgerIcon isOpen={isMobileMenuOpen} />
            </button>
          </div>

          <div
            id="landing-mobile-menu"
            className={isMobileMenuOpen
              ? 'overflow-hidden transition-all duration-300 max-h-[460px] pt-4 lg:hidden'
              : 'overflow-hidden transition-all duration-300 max-h-0 lg:hidden'}
          >
            <div className="rounded-[24px] border border-white/45 bg-[linear-gradient(135deg,_rgba(255,255,255,0.38),_rgba(248,240,255,0.3),_rgba(255,255,255,0.2))] p-2 shadow-[0_16px_40px_rgba(124,58,237,0.1)] backdrop-blur-2xl dark:border-violet-300/14 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.92))]">
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-white/50 hover:text-violet-900 dark:text-violet-50 dark:hover:bg-violet-400/15"
                  >
                    {item.label}
                  </a>
                ))}
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-white/50 hover:text-violet-900 dark:text-violet-50 dark:hover:bg-violet-400/15"
                >
                  {t('common.login')}
                </Link>
                <div className="px-2 pb-1 pt-2">
                  <LanguageSwitcher compact className="w-full justify-center" />
                </div>
              </nav>
            </div>
          </div>
        </header>

        <section
          id="top"
          className="grid gap-9 px-1 pb-10 pt-9 sm:pb-12 sm:pt-11 lg:grid-cols-[0.95fr_1.05fr] lg:items-center xl:gap-12 xl:pb-14 xl:pt-12"
        >
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-violet-900 dark:border-violet-300/20 dark:bg-white/8 dark:text-violet-100">
                {t('landing.heroEyebrow')}
              </span>
              <span className="rounded-full border border-violet-200/80 bg-violet-50/72 px-3 py-1.5 text-xs font-semibold text-violet-900 dark:border-violet-300/20 dark:bg-violet-400/16 dark:text-violet-100">
                {t('landing.localSignal')}
              </span>
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-stone-950 dark:text-white sm:text-4xl md:text-5xl xl:text-6xl">
              {t('landing.heroLineOne')}
              {' '}
              <br />
              <span className="text-violet-700">{t('landing.heroLineTwo')}</span>
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-stone-600 dark:text-violet-100/78 md:text-lg xl:text-xl xl:leading-8">
              {t('landing.heroDescription')}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link
                to="/discover/veterinarians"
                className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#6d28d9,#7c3aed)] px-6 py-3 text-base font-semibold text-white shadow-[0_16px_30px_rgba(124,58,237,0.2)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 sm:w-auto lg:px-7 lg:py-3.5"
              >
                {t('landing.findVeterinarian')}
              </Link>
              <Link
                to="/pros"
                className="inline-flex w-full items-center justify-center rounded-full border border-violet-200 bg-white px-6 py-3 text-base font-semibold text-violet-900 transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-violet-300/18 dark:bg-black/40 dark:text-violet-50 dark:hover:bg-violet-400/15 sm:w-auto lg:px-7 lg:py-3.5"
              >
                {t('landing.professionalCta')}
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-10 hidden h-28 w-28 rounded-full bg-violet-200/70 blur-3xl md:block" />
            <div className="absolute -right-6 bottom-12 hidden h-28 w-28 rounded-full bg-fuchsia-200/70 blur-3xl md:block" />
            <div className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white/92 p-4 shadow-[0_30px_80px_rgba(124,58,237,0.12)] backdrop-blur dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.92))] sm:rounded-[36px] sm:p-5 lg:p-6">
              <img
                src={heroImage}
                alt={t('landing.heroImageAlt')}
                className="h-[350px] w-full rounded-[24px] object-cover sm:h-[410px] lg:h-[470px]"
                loading="eager"
              />
            </div>
          </div>
        </section>

        {features.startupPilot ? <PublicMarketplaceShowcase careOnly /> : null}

        <section
          id="features"
          aria-labelledby="landing-journey-title"
          className="rounded-[30px] border border-white/80 bg-white/88 p-5 shadow-[0_20px_60px_rgba(124,58,237,0.08)] backdrop-blur dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.92))] sm:rounded-[34px] sm:p-7 lg:p-8 xl:p-10"
        >
          <h2
            id="landing-journey-title"
            className="text-center text-2xl font-semibold text-stone-950 dark:text-white sm:text-3xl xl:text-4xl"
          >
            {t('landing.howItWorks')}
          </h2>
          <ol className="mt-7 grid gap-4 sm:grid-cols-2 xl:mt-9 xl:grid-cols-5 xl:gap-5">
            {journeySteps.map((step, index) => (
              <li key={step.title} className="min-w-0">
                <article className="h-full rounded-[26px] border border-violet-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(244,237,255,0.82))] p-5 transition duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_18px_40px_rgba(124,58,237,0.08)] dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(8,5,13,0.98),_rgba(24,11,43,0.96))]">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-900 dark:bg-violet-400/15 dark:text-violet-100"
                  >
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-stone-950 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-stone-600 dark:text-violet-100/78">
                    {step.description}
                  </p>
                </article>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="professionnels"
          aria-labelledby="landing-professionals-title"
          className="mt-8 rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_60px_rgba(124,58,237,0.08)] backdrop-blur dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.92))] sm:rounded-[34px] sm:p-7 lg:p-8"
        >
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
              {t('landing.professionalEyebrow')}
            </p>
            <h2
              id="landing-professionals-title"
              className="mt-2 text-2xl font-semibold text-stone-950 dark:text-white sm:text-3xl xl:text-4xl"
            >
              {t('landing.professionalsTitle')}
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-violet-100/78 lg:text-base">
              {t('landing.professionalsDescription')}
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {professionalFeatures.map((feature) => (
              <article
                key={feature.title}
                className="rounded-[24px] border border-violet-100 bg-violet-50/55 p-4 dark:border-violet-300/16 dark:bg-white/6 sm:p-5"
              >
                <h3 className="text-base font-semibold text-stone-950 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-violet-100/78">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
          <Link
            to="/pros"
            className="mt-6 inline-flex items-center rounded-full bg-[linear-gradient(135deg,#6d28d9,#7c3aed)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,58,237,0.18)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 lg:px-6 lg:py-3 lg:text-base"
          >
            {t('landing.professionalLearnMore')}
          </Link>
        </section>

        <section
          aria-labelledby="landing-trust-title"
          className="mt-8 rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_60px_rgba(124,58,237,0.08)] backdrop-blur dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.92))] sm:rounded-[34px] sm:p-7 lg:p-8"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2
              id="landing-trust-title"
              className="text-2xl font-semibold text-stone-950 dark:text-white sm:text-3xl"
            >
              {t('landing.trustTitle')}
            </h2>
            <Link
              to="/trust"
              className="shrink-0 text-sm font-semibold text-violet-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200"
            >
              {t('landing.trustLearnMore')}
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {trustFeatures.map((feature) => (
              <article
                key={feature.title}
                className="rounded-[24px] border border-violet-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(244,237,255,0.82))] p-4 dark:border-violet-300/16 dark:bg-white/6 sm:p-5"
              >
                <h3 className="text-base font-semibold text-stone-950 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-violet-100/78">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="landing-services-title"
          className="mt-8 flex flex-col gap-4 rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_60px_rgba(124,58,237,0.08)] backdrop-blur dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.92))] sm:flex-row sm:items-center sm:justify-between sm:rounded-[34px] sm:p-7 lg:p-8"
        >
          <div>
            <h2
              id="landing-services-title"
              className="text-2xl font-semibold text-stone-950 dark:text-white sm:text-3xl"
            >
              {t('landing.servicesTitle')}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600 dark:text-violet-100/78 lg:text-base">
              {t('landing.servicesDescription')}
            </p>
          </div>
          <Link
            to="/discover/services"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-violet-200 bg-white px-5 py-2.5 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-violet-300/18 dark:bg-black/40 dark:text-violet-50 dark:hover:bg-violet-400/15"
          >
            {t('landing.servicesLink')}
          </Link>
        </section>

        {!features.startupPilot ? <PublicMarketplaceShowcase /> : null}

        <section
          id="communaute"
          aria-labelledby="landing-secondary-title"
          className="mt-8 grid gap-6 rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_60px_rgba(124,58,237,0.08)] backdrop-blur dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.92))] sm:rounded-[34px] sm:p-6 lg:grid-cols-[1fr_1fr] lg:items-center xl:gap-8 xl:p-8"
        >
          <div>
            <h2
              id="landing-secondary-title"
              className="text-2xl font-semibold text-stone-950 dark:text-white sm:text-3xl xl:text-4xl"
            >
              {t('landing.secondaryTitle')}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600 dark:text-violet-100/78 lg:text-base xl:text-[17px] xl:leading-8">
              {t('landing.secondaryDescription')}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/communities"
                className="inline-flex items-center rounded-full border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-violet-300/18 dark:bg-black/40 dark:text-violet-50 dark:hover:bg-violet-400/15"
              >
                {t('landing.communitiesLink')}
              </Link>
              <Link
                to="/feed"
                className="inline-flex items-center rounded-full border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-violet-300/18 dark:bg-black/40 dark:text-violet-50 dark:hover:bg-violet-400/15"
              >
                {t('landing.feedLink')}
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-violet-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.84))] p-4 dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(8,5,13,0.98),_rgba(24,11,43,0.96))]">
            <img
              src={companionImage}
              alt={t('landing.communityImageAlt')}
              className="h-full min-h-[260px] w-full rounded-[22px] object-cover"
              loading="lazy"
            />
          </div>
        </section>

        <div id="aide">
          <Footer mode="public" className="mt-8" />
        </div>
      </div>
      </main>
    </>
  )
}

function BurgerIcon({ isOpen }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      {isOpen ? (
        <path
          d="m6.75 6.75 10.5 10.5m0-10.5-10.5 10.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M4.5 7.5h15m-15 4.5h15m-15 4.5h15"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

export default LandingPage
