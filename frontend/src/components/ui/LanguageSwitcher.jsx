import { useI18n } from '../../hooks/useI18n'
import { LOCALE_LABELS } from '../../lib/i18n'

function LanguageSwitcher({ className = '', compact = false, disabled = false, onLocaleChange }) {
  const { dir, locale, setLocale, t } = useI18n()

  const options = [
    { value: 'fr', label: LOCALE_LABELS.fr, ariaLabel: t('common.french'), shortLabel: 'FR' },
    { value: 'ar', label: LOCALE_LABELS.ar, ariaLabel: t('common.arabic'), shortLabel: 'AR' },
    { value: 'en', label: LOCALE_LABELS.en, ariaLabel: t('common.english'), shortLabel: 'EN' },
  ]

  return (
    <div
      className={`yz-horizontal-scroll yz-no-scrollbar max-w-full items-center gap-1 rounded-[22px] border border-white/50 bg-white/32 p-1 shadow-[0_10px_24px_rgba(124,58,237,0.08)] backdrop-blur-xl dark:border-violet-300/18 dark:bg-white/8 sm:inline-flex sm:rounded-full ${className}`}
      aria-label={t('common.chooseLanguage')}
      dir={dir}
    >
      {!compact ? (
        <span className="shrink-0 whitespace-nowrap px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-600 dark:text-violet-100/75">
          {t('common.language')}
        </span>
      ) : null}

      {options.map((option) => {
        const active = locale === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => (onLocaleChange ? onLocaleChange(option.value) : setLocale(option.value))}
            disabled={disabled}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? 'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_10px_20px_rgba(124,58,237,0.14)]'
                : 'text-stone-600 hover:bg-violet-50 hover:text-violet-900 dark:text-violet-100 dark:hover:bg-violet-400/15 dark:hover:text-white'
            } disabled:cursor-wait disabled:opacity-60`}
            aria-label={option.ariaLabel}
            aria-pressed={active}
            title={option.ariaLabel}
          >
            {compact ? option.shortLabel : option.label}
          </button>
        )
      })}
    </div>
  )
}

export default LanguageSwitcher
