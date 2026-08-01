import PropTypes from 'prop-types'
import { Link } from 'react-router'

import {
  formatListingDate,
  formatListingPrice,
  getBadgeTranslationKey,
} from './publicListingFormat'
import { getPublicMarketplaceListingPath } from './publicMarketplaceConfig'
import Avatar from '../ui/Avatar'

function PublicListingCard({ listing, locale, section, t }) {
  const dateLabel = formatListingDate(listing.createdAt, locale)
  const badgeKey = getBadgeTranslationKey(listing.badge)
  const professionalBadgeKey = getBadgeTranslationKey(listing.professionalBadge)
  const detailPath = getPublicMarketplaceListingPath(section, listing.id)

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[24px] border border-violet-100 bg-[linear-gradient(180deg,#ffffff,#f8f3ff)] shadow-[0_14px_34px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-[linear-gradient(180deg,_rgba(24,16,38,0.98),_rgba(36,20,61,0.94))]">
      <Link
        to={detailPath}
        className="block h-44 bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400 dark:bg-white/8"
        aria-label={`${t('landing.marketplaceDetails')}: ${listing.title}`}
      >
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title || ''}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="flex h-full items-center justify-center px-6 text-center text-sm text-violet-500 dark:text-violet-200/65">
            {t('landing.marketplaceImageMissing')}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-stone-950 dark:text-white">
              {listing.title}
            </h2>
            <p className="mt-1 truncate text-xs text-stone-500 dark:text-violet-100/60">
              {listing.subtitle || listing.location}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {professionalBadgeKey ? (
              <Badge className="border border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-300/30 dark:bg-emerald-950/80 dark:text-emerald-100">
                {t(professionalBadgeKey)}
              </Badge>
            ) : null}
            {badgeKey ? (
              <Badge className="border border-violet-200 bg-violet-100 text-violet-900 dark:border-violet-300/30 dark:bg-violet-950/80 dark:text-violet-100">
                {t(badgeKey)}
              </Badge>
            ) : null}
          </div>
        </div>

        {listing.price !== null ? (
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            {formatListingPrice(listing.price, locale)}
          </p>
        ) : null}

        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-stone-600 dark:text-violet-100/74">
          {listing.description || t('landing.marketplaceNoDescription')}
        </p>

        <div className="mt-auto flex items-center gap-2 border-t border-violet-100 pt-3 dark:border-violet-300/12">
          <Avatar
            name={listing.author?.name || t('common.user')}
            src={listing.author?.avatar || ''}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-stone-700 dark:text-violet-50">
              {listing.author?.name || t('common.user')}
            </p>
            <p className="truncate text-[11px] text-stone-400 dark:text-violet-100/50">
              {[listing.location, dateLabel].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Link
            to={detailPath}
            className="shrink-0 rounded-full bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#24143d]"
          >
            {t('landing.marketplaceDetails')}
          </Link>
        </div>
      </div>
    </article>
  )
}

function Badge({ children, className }) {
  return (
    <span className={`inline-flex max-w-full items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${className}`}>
      {children}
    </span>
  )
}

PublicListingCard.propTypes = {
  listing: PropTypes.object.isRequired,
  locale: PropTypes.string.isRequired,
  section: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,
}

Badge.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
}

export default PublicListingCard
