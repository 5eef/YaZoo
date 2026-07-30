import { useLegalConfig } from '../../hooks/useLegalConfig'
import { useI18n } from '../../hooks/useI18n'

function LegalConfigurationSummary() {
  const { config, isLoading } = useLegalConfig()
  const { t } = useI18n()
  const rows = [
    ['legal.config.entityName', config.entityName],
    ['legal.config.dataControllerName', config.dataControllerName],
    ['legal.config.privacyContactEmail', config.privacyContactEmail],
    ['legal.config.legalStatus', config.legalStatus],
    ['legal.config.address', config.address],
    ['legal.config.ice', config.ice],
    [
      'legal.config.retention',
      positiveNumber(config.dataRetentionDays)
        ? t('legal.config.daysValue', { count: config.dataRetentionDays })
        : '',
    ],
    [
      'legal.config.responseTime',
      positiveNumber(config.dataRequestResponseDays)
        ? t('legal.config.daysValue', { count: config.dataRequestResponseDays })
        : '',
    ],
  ].filter(([, value]) => typeof value === 'string' && value.trim() !== '')

  if (isLoading || rows.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="legal-config-title"
      className="mt-5 rounded-[26px] border border-violet-200/70 bg-violet-50/80 p-5 shadow-[0_18px_40px_rgba(124,58,237,0.08)] dark:border-violet-300/16 dark:bg-violet-400/10 lg:p-6"
    >
      <h2 id="legal-config-title" className="text-lg font-semibold text-stone-950 dark:text-violet-50 lg:text-xl">
        {t('legal.config.title')}
      </h2>
      <dl className="mt-4 grid gap-3 md:grid-cols-2">
        {rows.map(([labelKey, value]) => (
          <div key={labelKey} className="rounded-2xl bg-white/80 px-4 py-3 dark:bg-white/8">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700 dark:text-violet-200">
              {t(labelKey)}
            </dt>
            <dd className="mt-1 break-words text-sm text-stone-700 dark:text-violet-50">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function positiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0
}

export default LegalConfigurationSummary
