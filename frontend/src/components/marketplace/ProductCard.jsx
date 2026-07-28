import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import { Link } from 'react-router'
import ReportButton from '../reports/ReportButton'
import VerifiedPhoneBadge from '../ui/VerifiedPhoneBadge'
import { FavoriteButton, Info, LinkButton, ManualPaymentBadges, RatingSummary, SellerTrustBadges } from './MarketplaceCommon'
import {
  buildProductContactPath,
  buildPhoneContactHref,
  formatCondition,
  formatProductCategory,
  formatProductStatus,
  uniqueUrls,
} from '../../features/marketplace/marketplaceUtils'
import { formatDate } from '../../utils/formatDate'
import { useI18n } from '../../hooks/useI18n'

function ProductCard({ product, onDelete, onEdit }) {
  const { t } = useI18n()
  const gallery = uniqueUrls([product.imageUrl, ...(product.galleryUrls ?? [])])

  return (
    <article className="overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,239,255,0.9))] shadow-[0_18px_42px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-[linear-gradient(180deg,_rgba(24,16,38,0.96),_rgba(36,20,61,0.92))]">
      <div className="h-48 bg-stone-100 sm:h-60 md:h-72 lg:h-80">
        {gallery[0] ? (
          <img src={gallery[0]} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone-400">{t('products.imageMissing')}</div>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-3 py-1 text-xs font-medium text-white">
                {formatProductStatus(product.listingStatus, t)}
              </span>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-800">
                {formatProductCategory(product.category, t)}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-stone-950 dark:text-violet-50">{product.name}</h3>
            <p className="text-sm text-stone-500">{formatCondition(product.conditionStatus, t)}</p>
          </div>

          <span className="rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-3 py-1 text-xs font-medium text-white">
            {product.price} MAD
          </span>
        </div>

        <RatingSummary averageRating={product.averageRating} reviewsCount={product.reviewsCount} compact />

        <div className="flex items-center gap-3 rounded-[22px] bg-white/88 px-4 py-3 shadow-sm dark:bg-white/8">
          <AuthorAvatar author={product.author} t={t} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium text-stone-900 dark:text-violet-50">{product.author.name}</p>
              {product.author?.isPhoneVerified ? <VerifiedPhoneBadge /> : null}
            </div>
            <p className="text-xs text-stone-500 dark:text-violet-100/60">{[product.location, formatDate(product.createdAt)].filter(Boolean).join(' - ')}</p>
          </div>
        </div>

        <SellerTrustBadges author={product.author} />
        <ManualPaymentBadges />

        {gallery.length > 1 ? (
          <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
            {gallery.slice(0, 4).map((imageUrl) => (
              <img key={imageUrl} src={imageUrl} alt={product.name} loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-2xl object-cover snap-start sm:h-16 sm:w-16" />
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Info label={t('common.category')} value={formatProductCategory(product.category, t)} />
          <Info label={t('common.status')} value={formatProductStatus(product.listingStatus, t)} />
          <Info label={t('common.condition')} value={formatCondition(product.conditionStatus, t)} />
          <Info label={t('common.stock')} value={product.stock} />
        </div>

        <p className="text-sm leading-6 text-stone-600 dark:text-violet-100/76">{product.description}</p>
        <ProductActions product={product} onDelete={onDelete} onEdit={onEdit} />
      </div>
    </article>
  )
}

function ProductActions({ product, onDelete, onEdit }) {
  const { t } = useI18n()
  const phoneContactHref = buildPhoneContactHref(product.contactPhone || product.author?.phone)

  if (product.isOwner) {
    return (
      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <LinkButton to={`/marketplace/products/${product.id}`} variant="ghost" className="w-full sm:w-auto">{t('common.details')}</LinkButton>
        <Button type="button" variant="secondary" onClick={() => onEdit(product)} className="w-full sm:w-auto">{t('common.edit')}</Button>
        <Button type="button" variant="ghost" onClick={() => onDelete(product.id)} className="w-full sm:w-auto">{t('common.delete')}</Button>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:flex sm:flex-wrap">
      <LinkButton to={`/marketplace/products/${product.id}`} variant="secondary" className="w-full sm:w-auto">{t('common.details')}</LinkButton>
      <FavoriteButton type="products" itemId={product.id} initialFavorited={product.isFavorited} />
      {product.author?.id ? (
        <LinkButton to={buildProductContactPath(product, t)} variant="ghost" className="w-full sm:w-auto">{t('common.contact')}</LinkButton>
      ) : null}
      {!product.author?.id && phoneContactHref ? (
        <a
          href={phoneContactHref}
          className="inline-flex w-full items-center justify-center rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-100 sm:w-auto"
        >
          {t('common.contact')}
        </a>
      ) : null}
      <ReportButton reportableType="product" reportableId={product.id} isOwner={product.isOwner} />
    </div>
  )
}

function AuthorAvatar({ author, t }) {
  const avatar = <Avatar name={author?.name} src={author?.avatar || ''} size="sm" />

  if (!author?.id) {
    return avatar
  }

  return (
    <Link
      to={`/profile/${author.id}`}
      className="shrink-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
      aria-label={t('profile.viewProfile')}
    >
      {avatar}
    </Link>
  )
}

export default ProductCard
