import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'

import companionImage from '../assets/images/companions-bond.webp'
import heroImage from '../assets/images/hero-bond.webp'
import hero1Image from '../assets/images/hero1.webp'
import hero2Image from '../assets/images/hero2.webp'
import hero3Image from '../assets/images/hero3.webp'
import PublicMarketplaceShowcase from '../components/marketplace/PublicMarketplaceShowcase'
import Footer from '../components/ui/Footer'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../hooks/useI18n'

function LandingPage() {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const { t } = useI18n()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navItems = [
    { href: '#features', label: t('landing.navFeatures') },
    { href: '#communaute', label: t('landing.navCommunity') },
    { href: '#aide', label: t('landing.navHelp') },
  ]
  const featureCards = [
    {
      title: t('landing.shareTitle'),
      description: t('landing.shareText'),
      image: hero1Image,
    },
    {
      title: t('landing.adoptionTitle'),
      description: t('landing.adoptionText'),
      image: hero3Image,
    },
    {
      title: t('landing.communityTitle'),
      description: t('landing.communityText'),
      image: hero2Image,
    },
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

  if (isBootstrapping) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#fffaff_0%,_#f5eeff_100%)] px-4 py-10 dark:bg-[linear-gradient(180deg,_#05030a_0%,_#180b2b_100%)]">
        <p className="text-sm text-stone-600 dark:text-violet-100/80">{t('common.loadingSession')}</p>
      </main>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/feed" replace />
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(244,208,255,0.22),_transparent_20%),linear-gradient(180deg,_#fffaff_0%,_#f6efff_100%)] px-3 py-4 transition-colors dark:bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.34),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(76,29,149,0.38),_transparent_24%),linear-gradient(180deg,_#05030a_0%,_#10091a_46%,_#1b1030_100%)] sm:px-4 sm:py-5">
      <div className="w-full lg:px-6">
        <header className="sticky top-3 z-30 rounded-[26px] border border-white/55 bg-[linear-gradient(135deg,_rgba(255,255,255,0.52),_rgba(248,240,255,0.36),_rgba(255,255,255,0.28))] px-4 py-3.5 shadow-[0_24px_60px_rgba(124,58,237,0.1)] backdrop-blur-2xl dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.96),_rgba(30,15,52,0.9))] sm:top-4 sm:rounded-[30px] sm:py-4 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <a href="#top" className="flex min-w-0 items-center gap-3">
              <img
                src="/yazoo-logo.svg"
                alt={t('landing.logoAlt')}
                className="h-12 w-12 object-contain sm:h-14 sm:w-14"
              />
              <div className="min-w-0">
                <p className="yz-wordmark text-base">YaZoo</p>
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
                  className="rounded-full px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-white/46 hover:text-violet-800 dark:text-violet-50 dark:hover:bg-violet-400/15 dark:hover:text-white xl:px-5 xl:py-2.5 xl:text-base"
                >
                  {item.label}
                </a>
              ))}
              <Link
                to="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-white/46 hover:text-violet-800 dark:text-violet-50 dark:hover:bg-violet-400/15 dark:hover:text-white xl:px-5 xl:py-2.5 xl:text-base"
              >
                {t('common.login')}
              </Link>
            </nav>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/50 bg-white/30 text-stone-700 shadow-[0_12px_26px_rgba(124,58,237,0.08)] backdrop-blur-xl transition hover:border-white/70 hover:bg-white/46 hover:text-violet-800 dark:border-violet-300/16 dark:bg-black/35 dark:text-white dark:hover:bg-violet-400/18 lg:hidden"
              aria-label={isMobileMenuOpen ? t('layout.menuClose') : t('layout.menuOpen')}
              aria-expanded={isMobileMenuOpen}
              aria-controls="landing-mobile-menu"
            >
              <BurgerIcon isOpen={isMobileMenuOpen} />
            </button>
          </div>

          <div
            id="landing-mobile-menu"
            className={`overflow-hidden transition-all duration-300 lg:hidden ${
              isMobileMenuOpen ? 'max-h-[360px] pt-4' : 'max-h-0'
            }`}
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
              </nav>
            </div>
          </div>
        </header>

        <section
          id="top"
          className="grid gap-9 px-1 pb-10 pt-9 sm:pb-12 sm:pt-11 lg:grid-cols-[0.95fr_1.05fr] lg:items-center xl:gap-12 xl:pb-14 xl:pt-12"
        >
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-stone-950 dark:text-white sm:text-4xl md:text-5xl xl:text-6xl">
              {t('landing.heroLineOne')}
              <br />
              <span className="text-violet-700">{t('landing.heroLineTwo')}</span>
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-stone-600 dark:text-violet-100/78 md:text-lg xl:text-xl xl:leading-8">
              {t('landing.heroDescription')}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <a
                href="#features"
                className="inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] px-6 py-3 text-base font-semibold text-white shadow-[0_16px_30px_rgba(124,58,237,0.2)] transition hover:brightness-105 sm:w-auto lg:px-7 lg:py-3.5"
              >
                {t('landing.discover')}
              </a>
              <Link
                to="/register"
                className="inline-flex w-full items-center justify-center rounded-full border border-violet-200 bg-white px-6 py-3 text-base font-medium text-violet-900 transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 dark:border-violet-300/18 dark:bg-black/40 dark:text-violet-50 dark:hover:bg-violet-400/15 sm:w-auto lg:px-7 lg:py-3.5"
              >
                {t('common.register')}
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

        <PublicMarketplaceShowcase />

        <section
          id="features"
          className="rounded-[30px] border border-white/80 bg-white/88 p-5 shadow-[0_20px_60px_rgba(124,58,237,0.08)] backdrop-blur dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.92))] sm:rounded-[34px] sm:p-7 lg:p-8 xl:p-10"
        >
          <h2 className="text-center text-2xl font-semibold text-stone-950 dark:text-white sm:text-3xl xl:text-4xl">
            {t('landing.howItWorks')}
          </h2>
          <div className="mt-7 grid gap-5 md:grid-cols-3 xl:mt-9 xl:gap-6">
            {featureCards.map((feature) => (
              <article
                key={feature.title}
                className="rounded-[28px] border border-violet-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(244,237,255,0.82))] p-4 transition duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_18px_40px_rgba(124,58,237,0.08)] dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(8,5,13,0.98),_rgba(24,11,43,0.96))] sm:p-5 xl:p-6"
              >
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="h-48 w-full rounded-[20px] object-cover sm:h-64 md:h-80 lg:h-96 xl:h-[28rem]"
                  loading="lazy"
                />
                <h3 className="mt-4 text-lg font-semibold text-stone-950 dark:text-white lg:text-xl">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-stone-600 dark:text-violet-100/78 lg:text-base lg:leading-7 xl:text-[17px] xl:leading-8">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="communaute"
          className="mt-8 grid gap-6 rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_60px_rgba(124,58,237,0.08)] backdrop-blur dark:border-violet-300/16 dark:bg-[linear-gradient(135deg,_rgba(5,3,10,0.98),_rgba(30,15,52,0.92))] sm:rounded-[34px] sm:p-6 lg:grid-cols-[1fr_1fr] lg:items-center xl:gap-8 xl:p-8"
        >
          <div>
            <h2 className="text-2xl font-semibold text-stone-950 dark:text-white sm:text-3xl xl:text-4xl">
              {t('landing.whyChooseTitle')}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600 dark:text-violet-100/78 lg:text-base xl:text-[17px] xl:leading-8">
              {t('landing.whyChooseText')}
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,58,237,0.18)] transition hover:brightness-105 lg:px-6 lg:py-3 lg:text-base"
            >
              {t('landing.joinCommunity')}
            </Link>
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
