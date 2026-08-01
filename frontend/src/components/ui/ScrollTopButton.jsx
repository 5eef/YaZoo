import { useEffect, useState } from 'react'

import { useI18n } from '../../hooks/useI18n'

function ScrollTopButton() {
  const { t } = useI18n()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(globalThis.scrollY > 200)
    }

    handleScroll()
    globalThis.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      globalThis.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleScrollTop = () => {
    const behavior = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth'
    const mainContent = document.getElementById('main-content')

    if (mainContent?.scrollIntoView) {
      mainContent.scrollIntoView({ behavior, block: 'start' })
      return
    }

    globalThis.scrollTo({ top: 0, behavior })
  }

  return (
    <button
      type="button"
      onClick={handleScrollTop}
      className={`fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] right-3 z-40 inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-violet-200/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(237,233,254,0.98))] text-violet-950 shadow-[0_22px_42px_rgba(124,58,237,0.24)] transition-[opacity,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_48px_rgba(124,58,237,0.3)] motion-reduce:transition-none dark:border-violet-300/30 dark:bg-[linear-gradient(135deg,rgba(124,58,237,0.98),rgba(76,29,149,0.98))] dark:text-white dark:shadow-[0_22px_46px_rgba(0,0,0,0.48)] dark:hover:shadow-[0_28px_54px_rgba(124,58,237,0.32)] ${
        isVisible
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0'
      } lg:bottom-8 lg:right-8 xl:bottom-6 xl:left-[6.5rem] xl:right-auto`}
      aria-label={t('common.scrollTop')}
      title={t('common.scrollTop')}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5 shrink-0"
        aria-hidden="true"
      >
        <path
          d="M12 18V6m0 0-5.25 5.25M12 6l5.25 5.25"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

export default ScrollTopButton
