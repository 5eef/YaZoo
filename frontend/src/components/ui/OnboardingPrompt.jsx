import { useState } from 'react'
import PropTypes from 'prop-types'

import Button from './Button'
import { useI18n } from '../../hooks/useI18n'

const STORAGE_KEY = 'yazoo-onboarding-v1'
const USER_TYPES = ['individual', 'professional', 'veterinarian']
const CHECKLIST_ITEMS = ['profile', 'trust', 'firstAction']

function OnboardingPrompt({ userId }) {
  const { isRtl, t } = useI18n()
  const [isVisible, setIsVisible] = useState(() => !hasCompletedOnboarding(buildStorageKey(userId)))
  const [selectedType, setSelectedType] = useState('individual')

  const close = () => {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.setItem(buildStorageKey(userId), 'done')
      if (selectedType) {
        globalThis.localStorage.setItem(`${buildStorageKey(userId)}:type`, selectedType)
      }
    }

    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  return (
    <section
      role="region"
      className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-3xl rounded-[28px] border border-white/70 bg-white/96 p-4 text-start shadow-[0_24px_70px_rgba(35,13,68,0.24)] backdrop-blur-2xl dark:border-violet-300/16 dark:bg-[#150c23]/96 sm:bottom-5 sm:p-5 lg:bottom-6"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-labelledby="yazoo-onboarding-title"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <p className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-violet-700 dark:bg-white/10 dark:text-violet-100">
            {t('onboarding.badge')}
          </p>
          <h2 id="yazoo-onboarding-title" className="mt-3 text-lg font-semibold text-stone-950 dark:text-violet-50">
            {t('onboarding.title')}
          </h2>
          <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1">
            {USER_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                aria-pressed={selectedType === type}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${
                  selectedType === type
                    ? 'bg-violet-600 text-white'
                    : 'bg-violet-50 text-violet-800 hover:bg-violet-100 dark:bg-white/10 dark:text-violet-50'
                }`}
              >
                {t(`onboarding.userTypes.${type}`)}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 text-sm text-stone-600 dark:text-violet-100/72 sm:grid-cols-3">
            {CHECKLIST_ITEMS.map((item, index) => (
              <OnboardingStep
                key={`${selectedType}-${item}`}
                index={String(index + 1)}
                text={t(`onboarding.checklists.${selectedType}.${item}`)}
              />
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:flex sm:justify-end">
          <Button type="button" variant="ghost" onClick={close} className="w-full sm:w-auto">
            {t('onboarding.skip')}
          </Button>
          <Button type="button" onClick={close} className="w-full sm:w-auto">
            {t('onboarding.start')}
          </Button>
        </div>
      </div>
    </section>
  )
}

function OnboardingStep({ index, text }) {
  return (
    <div className="rounded-[18px] bg-violet-50/80 px-3 py-3 dark:bg-white/10">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
        {index}
      </span>
      <p className="mt-2 leading-5">{text}</p>
    </div>
  )
}

function buildStorageKey(userId) {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY
}

function hasCompletedOnboarding(storageKey) {
  if (typeof globalThis.localStorage === 'undefined') {
    return true
  }

  return globalThis.localStorage.getItem(storageKey) === 'done'
}

OnboardingPrompt.propTypes = {
  userId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
}

OnboardingStep.propTypes = {
  index: PropTypes.string,
  text: PropTypes.string,
}

export default OnboardingPrompt
