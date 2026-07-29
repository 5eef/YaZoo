const TRANSLATED_BADGES = new Set([
  'adoption',
  'available',
  'reserved',
  'new',
  'used',
  'fixed',
  'hourly',
  'daily',
  'session',
  'negotiable',
  'verified_professional',
  'verified_seller',
  'verified_pet_shop',
  'verified_breeder',
  'verified_trainer',
  'verified_service_provider',
  'verified_veterinarian',
])

export function getBadgeTranslationKey(badge) {
  return TRANSLATED_BADGES.has(badge)
    ? `landing.marketplaceBadges.${badge}`
    : null
}

export function formatListingDate(value, locale) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-MA' : locale, {
    dateStyle: 'medium',
  }).format(date)
}

export function formatListingPrice(value, locale) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale, {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 2,
  }).format(value)
}
