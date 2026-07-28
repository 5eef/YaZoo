import { Link } from 'react-router'
import PropTypes from 'prop-types'
import { useState } from 'react'
import { removeFavoriteRequest, saveFavoriteRequest } from '../../api/favorites'
import { useI18n } from '../../hooks/useI18n'

const PROFESSIONAL_BADGE_TRANSLATIONS = {
  verified_seller: 'verifiedSeller',
  verified_pet_shop: 'verifiedPetShop',
  verified_breeder: 'verifiedBreeder',
  verified_trainer: 'verifiedTrainer',
  verified_service_provider: 'verifiedServiceProvider',
  verified_veterinarian: 'verifiedVeterinarian',
}

export function MarketplaceTabs({ active }) {
  const { t } = useI18n()

  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain pb-1 yz-no-scrollbar" aria-label={t('common.marketplace')}>
      <div className="inline-flex min-w-max gap-2 rounded-full border border-white/80 bg-white/82 p-1.5 shadow-[0_14px_30px_rgba(124,58,237,0.08)]">
        <TabLink to="/marketplace" active={active === 'animals'}>{t('common.animals')}</TabLink>
        <TabLink to="/marketplace/products" active={active === 'products'}>{t('common.products')}</TabLink>
        <TabLink to="/marketplace/veterinarians" active={active === 'veterinarians'}>{t('common.veterinarians')}</TabLink>
        <TabLink to="/marketplace/services" active={active === 'services'}>{t('common.services')}</TabLink>
      </div>
    </div>
  )
}

function TabLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition lg:px-5 lg:py-2.5 lg:text-base ${
        active
          ? 'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white shadow-[0_12px_24px_rgba(124,58,237,0.16)]'
          : 'text-stone-600 hover:bg-violet-50 hover:text-violet-900'
      }`}
    >
      {children}
    </Link>
  )
}

export function MarketplaceHero({ active, title, description, imageSrc, imageAlt, stats, imageClass = '' }) {
  const { t } = useI18n()

  return (
    <section className="max-w-full overflow-hidden rounded-[30px] border border-white/80 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(221,214,254,0.5),_transparent_26%),linear-gradient(135deg,_rgba(255,255,255,0.98)_0%,_rgba(247,241,255,0.9)_48%,_rgba(237,233,254,0.84)_100%)] p-4 shadow-[0_24px_60px_rgba(124,58,237,0.1)] sm:rounded-[32px] sm:p-6 lg:p-7">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.12fr_0.88fr] xl:items-center xl:gap-7">
        <div className="min-w-0">
          <p className="inline-flex max-w-full rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
            {t('common.marketplaceBadge')}
          </p>
          <h1 className="mt-4 max-w-full text-2xl font-semibold leading-tight text-stone-950 sm:text-3xl xl:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl break-words text-sm leading-7 text-stone-600 lg:text-base xl:text-[17px] xl:leading-8">
            {description}
          </p>
          <div className="mt-5">
            <MarketplaceTabs active={active} />
          </div>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-3 xl:grid-cols-[1fr_auto] xl:items-center">
          {stats.map((stat) => (
            <HeroStatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
          <div className="overflow-hidden rounded-[26px] border border-violet-100 bg-white/82 p-4 shadow-sm sm:col-span-3 xl:col-span-1">
            <img src={imageSrc} alt={imageAlt} loading="lazy" decoding="async" className={imageClass} />
          </div>
        </div>
      </div>
    </section>
  )
}

export function HeroStatCard({ label, value }) {
  return (
    <div className="rounded-[24px] border border-violet-100 bg-white/88 px-4 py-4 shadow-sm lg:px-5 lg:py-5">
      <p className="text-xs uppercase tracking-[0.18em] text-stone-500 lg:text-sm">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-950 lg:text-3xl">{value}</p>
    </div>
  )
}

export function LinkButton({ children, to, variant = 'primary', className = '' }) {
  const variants = {
    primary: 'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] text-white hover:brightness-105 focus-visible:outline-violet-500',
    secondary: 'bg-white text-violet-900 ring-1 ring-inset ring-violet-200 hover:bg-violet-50 focus-visible:outline-violet-300',
    ghost: 'bg-violet-50 text-violet-800 hover:bg-violet-100 focus-visible:outline-violet-200',
  }

  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:px-5 lg:py-2.5 lg:text-base ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  )
}

export function TrustBadge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-300/18 dark:bg-white/8 dark:text-stone-100',
    violet: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-300/18 dark:bg-emerald-400/10 dark:text-emerald-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/18 dark:bg-amber-400/10 dark:text-amber-100',
  }

  return (
    <span className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone] ?? tones.neutral}`}>
      {children}
    </span>
  )
}

export function SellerTrustBadges({ author, sellerType }) {
  const { t } = useI18n()
  const badges = []
  const professionalBadgeKey = PROFESSIONAL_BADGE_TRANSLATIONS[author?.professionalBadge]

  if (professionalBadgeKey) {
    badges.push({
      key: author.professionalBadge,
      label: t(`marketplaceBadges.${professionalBadgeKey}`),
      tone: 'emerald',
    })
  } else if (author?.isProfessionalVerified) {
    badges.push({
      key: 'professionalVerified',
      label: t('marketplaceBadges.professionalVerified'),
      tone: 'emerald',
    })
  }

  if (sellerType === 'professional') {
    badges.push({ key: 'professional', label: t('marketplaceBadges.professional'), tone: 'violet' })
  }

  if (sellerType === 'association') {
    badges.push({ key: 'association', label: t('marketplaceBadges.association'), tone: 'violet' })
  }

  if (author?.isPhoneVerified) {
    badges.push({ key: 'phoneVerified', label: t('marketplaceBadges.phoneVerified'), tone: 'emerald' })
  }

  if (badges.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <TrustBadge key={badge.key} tone={badge.tone}>{badge.label}</TrustBadge>
      ))}
    </div>
  )
}

export function RatingSummary({ averageRating, reviewsCount, compact = false }) {
  const { t } = useI18n()
  const count = Number(reviewsCount ?? 0)

  if (count <= 0 || averageRating === null || averageRating === undefined) {
    return compact ? null : (
      <p className="text-xs font-medium text-stone-500 dark:text-violet-100/60">
        {t('common.noReviewYet')}
      </p>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">
      <span aria-hidden="true">*****</span>
      <span>{Number(averageRating).toFixed(1)}</span>
      <span>{t('common.reviewCount', { count })}</span>
    </div>
  )
}

export function FavoriteButton({ type, itemId, initialFavorited = false, disabled = false }) {
  const { t } = useI18n()
  const [isFavorited, setIsFavorited] = useState(Boolean(initialFavorited))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  let buttonLabel = t('socialTrust.saveFavorite')
  if (isFavorited) {
    buttonLabel = t('socialTrust.saved')
  }
  if (isSaving) {
    buttonLabel = t('common.loading')
  }

  const handleToggle = async () => {
    if (disabled || isSaving) return

    setIsSaving(true)
    setError('')

    try {
      if (isFavorited) {
        await removeFavoriteRequest({ type, id: itemId })
        setIsFavorited(false)
      } else {
        await saveFavoriteRequest({ type, id: itemId })
        setIsFavorited(true)
      }
    } catch (error) {
      setError(error?.response?.status === 401
        ? t('socialTrust.loginRequired')
        : t('socialTrust.favoriteError'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || isSaving}
        aria-pressed={isFavorited}
        aria-label={isFavorited ? t('socialTrust.removeFavorite') : t('socialTrust.saveFavorite')}
        className={`inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto ${
          isFavorited
            ? 'bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-200 hover:bg-amber-200 dark:bg-amber-400/14 dark:text-amber-100 dark:ring-amber-300/20'
            : 'bg-white text-violet-900 ring-1 ring-inset ring-violet-200 hover:bg-violet-50 dark:bg-white/10 dark:text-violet-50 dark:ring-violet-300/18'
        }`}
      >
        {buttonLabel}
      </button>
      {error ? <p className="mt-1 text-xs text-red-600 dark:text-red-200">{error}</p> : null}
    </div>
  )
}

export function ManualPaymentBadges({ includeOnlinePreparation = false }) {
  const { t } = useI18n()

  return (
    <div className="flex flex-wrap gap-2">
      <TrustBadge tone="violet">{t('marketplaceBadges.cashOnPickup')}</TrustBadge>
      <TrustBadge tone="violet">{t('marketplaceBadges.bankTransfer')}</TrustBadge>
      {includeOnlinePreparation ? (
        <TrustBadge tone="amber">{t('marketplaceBadges.onlinePaymentPreparing')}</TrustBadge>
      ) : null}
    </div>
  )
}

export function QuickFilterChips({ chips }) {
  return (
    <div className="max-w-full overflow-x-auto pb-1 yz-no-scrollbar">
      <div className="inline-flex min-w-max gap-2">
        {chips.filter(Boolean).map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.onClick}
            aria-pressed={Boolean(chip.active)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition lg:px-5 lg:py-2.5 lg:text-base ${
              chip.active
                ? 'bg-violet-600 text-white shadow-[0_10px_22px_rgba(124,58,237,0.18)]'
                : 'bg-white/84 text-violet-800 ring-1 ring-inset ring-violet-100 hover:bg-violet-50 dark:bg-white/10 dark:text-violet-50 dark:ring-violet-300/14'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700">{label}</span>
      <input
      className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50 dark:placeholder:text-violet-200/45"
        {...props}
      />
    </label>
  )
}

export function FileField({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700">{label}</span>
      <input
        type="file"
        className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 file:mr-4 file:rounded-full file:border-0 file:bg-[linear-gradient(135deg,#7c3aed,#a855f7)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
        {...props}
      />
    </label>
  )
}

export function SelectField({ label, options, ...props }) {
  const { t } = useI18n()

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700">{label}</span>
      <select
        className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.labelKey ? t(option.labelKey) : option.label}</option>
        ))}
      </select>
    </label>
  )
}

export function Info({ label, value }) {
  return (
    <div className="rounded-[20px] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(244,237,255,0.82))] px-4 py-3 text-sm text-stone-600">
      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="mt-1 font-medium text-stone-900">{value}</p>
    </div>
  )
}

MarketplaceTabs.propTypes = {
  active: PropTypes.string,
}

TabLink.propTypes = {
  to: PropTypes.string,
  active: PropTypes.bool,
  children: PropTypes.node,
}

MarketplaceHero.propTypes = {
  active: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
  imageSrc: PropTypes.string,
  imageAlt: PropTypes.string,
  stats: PropTypes.array,
  imageClass: PropTypes.string,
}

HeroStatCard.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
}

LinkButton.propTypes = {
  children: PropTypes.node,
  to: PropTypes.string,
  variant: PropTypes.string,
  className: PropTypes.string,
}

TrustBadge.propTypes = {
  children: PropTypes.node,
  tone: PropTypes.string,
}

SellerTrustBadges.propTypes = {
  author: PropTypes.object,
  sellerType: PropTypes.string,
}

ManualPaymentBadges.propTypes = {
  includeOnlinePreparation: PropTypes.bool,
}

RatingSummary.propTypes = {
  averageRating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  reviewsCount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  compact: PropTypes.bool,
}

FavoriteButton.propTypes = {
  type: PropTypes.string.isRequired,
  itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  initialFavorited: PropTypes.bool,
  disabled: PropTypes.bool,
}

QuickFilterChips.propTypes = {
  chips: PropTypes.array,
}

Field.propTypes = {
  label: PropTypes.string,
}

FileField.propTypes = {
  label: PropTypes.string,
}

SelectField.propTypes = {
  label: PropTypes.string,
  options: PropTypes.array,
}

Info.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
}
