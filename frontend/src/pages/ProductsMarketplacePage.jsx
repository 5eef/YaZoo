import { useCallback, useState } from 'react'

import productHeroImage from '../assets/images/produit.png'
import ProductCard from '../components/marketplace/ProductCard'
import ProductListingForm from '../components/marketplace/ProductListingForm'
import ProductsFilters from '../components/marketplace/ProductsFilters'
import { MarketplaceHero, QuickFilterChips } from '../components/marketplace/MarketplaceCommon'
import CollapsiblePanel from '../components/ui/CollapsiblePanel'
import { useProductsMarketplace } from '../hooks/useProductsMarketplace'
import { useMarketplaceCreateIntent } from '../hooks/useMarketplaceCreateIntent'
import { useI18n } from '../hooks/useI18n'

function ProductsMarketplacePage() {
  const { t } = useI18n()
  const marketplace = useProductsMarketplace()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const openCreatePanel = useCallback(() => setIsCreateOpen(true), [])
  const createPanelRef = useMarketplaceCreateIntent({ onOpen: openCreatePanel })

  return (
    <section className="space-y-6">
      <MarketplaceHero
        active="products"
        title={t('marketplace.productsHeroTitle')}
        description={t('marketplace.productsHeroDescription')}
        imageSrc={productHeroImage}
        imageAlt={t('marketplace.productsImageAlt')}
        imageClass="mx-auto h-24 w-auto rounded-[20px] object-cover sm:h-28 xl:w-[180px]"
        stats={[
          { label: t('common.visibleProducts'), value: marketplace.products.length },
          { label: t('common.filtersActive'), value: marketplace.activeFiltersCount },
        ]}
      />

      <QuickFilterChips
        chips={[
          {
            key: 'all',
            label: t('common.all'),
            active: marketplace.activeFiltersCount === 0,
            onClick: marketplace.handleResetFilters,
          },
          {
            key: 'food',
            label: t('products.labels.food'),
            active: marketplace.filters.category === 'food',
            onClick: () => marketplace.applyQuickFilter('category', 'food'),
          },
          {
            key: 'accessory',
            label: t('products.labels.accessory'),
            active: marketplace.filters.category === 'accessory',
            onClick: () => marketplace.applyQuickFilter('category', 'accessory'),
          },
          {
            key: 'available',
            label: t('products.labels.available'),
            active: marketplace.filters.listing_status === 'available',
            onClick: () => marketplace.applyQuickFilter('listing_status', 'available'),
          },
          {
            key: 'new',
            label: t('products.labels.new'),
            active: marketplace.filters.condition_status === 'new',
            onClick: () => marketplace.applyQuickFilter('condition_status', 'new'),
          },
        ]}
      />

      <ProductsFilters
        filters={marketplace.filters}
        activeFiltersCount={marketplace.activeFiltersCount}
        isOpen={marketplace.isFiltersOpen}
        onToggle={() => marketplace.setIsFiltersOpen((current) => !current)}
        onFilterChange={marketplace.handleFilterChange}
        onReset={marketplace.handleResetFilters}
        onSearch={marketplace.handleSearch}
      />

      <StatusMessage tone="error" message={marketplace.errorMessage} />
      <StatusMessage tone="success" message={marketplace.successMessage} />

      <div ref={createPanelRef}>
        <CollapsiblePanel
          kicker={t('common.products')}
          title={marketplace.editingId ? t('creation.editMode') : t('creation.addProduct')}
          description={t('marketplace.creationPanelDescription')}
          summary={marketplace.editingId ? t('creation.editMode') : t('creation.addProduct')}
          isOpen={isCreateOpen || Boolean(marketplace.editingId)}
          onToggle={() => setIsCreateOpen((current) => !current)}
          showLabel={t('creation.addProduct')}
          hideLabel={t('creation.hideForm')}
        >
          <ProductListingForm
            form={marketplace.form}
            editingId={marketplace.editingId}
            isSubmitting={marketplace.isSubmitting}
            imageFile={marketplace.imageFile}
            galleryFiles={marketplace.galleryFiles}
            existingPreviewUrls={marketplace.existingPreviewUrls}
            onCancelEdit={marketplace.resetForm}
            onFormChange={marketplace.handleFormChange}
            onGalleryFilesChange={marketplace.setGalleryFiles}
            onImageFileChange={marketplace.setImageFile}
            onSubmit={marketplace.handleSubmit}
          />
        </CollapsiblePanel>
      </div>

      <MarketplaceGrid
        isLoading={marketplace.isLoading}
        items={marketplace.products}
        loadingText={t('marketplace.loadingProducts')}
        emptyText={t('marketplace.emptyProducts')}
        renderItem={(product) => (
          <ProductCard
            key={product.id}
            product={product}
            onDelete={marketplace.handleDelete}
            onEdit={marketplace.handleEdit}
          />
        )}
      />
    </section>
  )
}

function StatusMessage({ tone, message }) {
  if (!message) return null

  const classes = tone === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  return <div className={`rounded-[28px] border px-5 py-4 text-sm ${classes}`}>{message}</div>
}

function MarketplaceGrid({ isLoading, items, loadingText, emptyText, renderItem }) {
  if (isLoading) {
    return (
      <div role="status" className="grid gap-4 lg:grid-cols-2" aria-label={loadingText}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`product-marketplace-skeleton-${index}`}
            className="animate-pulse rounded-[28px] border border-violet-100 bg-white/84 p-4 shadow-[0_18px_38px_rgba(124,58,237,0.06)]"
          >
            <div className="aspect-[4/3] rounded-[22px] bg-violet-100/80" />
            <div className="mt-4 h-4 w-2/3 rounded-full bg-violet-100" />
            <div className="mt-3 h-3 w-full rounded-full bg-violet-50" />
            <div className="mt-2 h-3 w-4/5 rounded-full bg-violet-50" />
            <div className="mt-4 flex gap-2">
              <div className="h-8 flex-1 rounded-full bg-violet-100" />
              <div className="h-8 w-20 rounded-full bg-violet-50" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-violet-200 bg-white/84 px-5 py-12 text-center text-sm text-stone-500">
        {emptyText}
      </div>
    )
  }

  return <div className="grid gap-4 lg:grid-cols-2">{items.map(renderItem)}</div>
}

export default ProductsMarketplacePage
