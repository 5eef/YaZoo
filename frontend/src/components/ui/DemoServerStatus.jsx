import { useI18n } from '../../hooks/useI18n'
import { useDemoBackendStatus } from '../../hooks/useDemoBackendStatus'

const COPY = {
  fr: {
    connecting: 'Connexion au serveur de démonstration…',
    detail: "Le serveur gratuit peut nécessiter jusqu’à une minute pour démarrer.",
    unavailable: 'Le serveur de démonstration ne répond pas pour le moment.',
    retry: 'Réessayer',
  },
  ar: {
    connecting: 'جارٍ الاتصال بخادم العرض…',
    detail: 'قد يحتاج الخادم المجاني إلى دقيقة تقريبًا لبدء التشغيل.',
    unavailable: 'خادم العرض غير متاح حاليًا.',
    retry: 'إعادة المحاولة',
  },
  en: {
    connecting: 'Connecting to demo server…',
    detail: 'The free demo backend may need up to one minute to wake up.',
    unavailable: 'The demo server is unavailable right now.',
    retry: 'Retry',
  },
}

function DemoServerStatus() {
  const { locale } = useI18n()
  const { retry, status } = useDemoBackendStatus()
  const copy = COPY[locale] ?? COPY.en

  if (status === 'ready') {
    return null
  }

  const isUnavailable = status === 'unavailable'

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-xl rounded-2xl border border-violet-200/80 bg-white/95 px-4 py-3 text-start shadow-[0_18px_48px_rgba(76,29,149,0.18)] backdrop-blur dark:border-violet-300/20 dark:bg-[#160c24]/95 sm:bottom-4"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
            isUnavailable
              ? 'bg-amber-500'
              : 'animate-pulse bg-violet-600 motion-reduce:animate-none'
          }`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900 dark:text-white">
            {isUnavailable ? copy.unavailable : copy.connecting}
          </p>
          {!isUnavailable ? (
            <p className="mt-0.5 text-xs leading-5 text-stone-600 dark:text-violet-100/75">
              {copy.detail}
            </p>
          ) : null}
        </div>
        {isUnavailable ? (
          <button
            type="button"
            onClick={retry}
            className="shrink-0 rounded-full bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
          >
            {copy.retry}
          </button>
        ) : null}
      </div>
    </aside>
  )
}

export default DemoServerStatus
