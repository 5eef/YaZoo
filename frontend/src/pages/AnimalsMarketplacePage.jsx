import { useCallback, useState } from 'react'

import animalFamilyImage from '../assets/images/cute-animals-group-white-background-removebg-preview.webp'
import AnimalCard from '../components/marketplace/AnimalCard'
import AnimalListingForm from '../components/marketplace/AnimalListingForm'
import AnimalSafetyNotice from '../components/marketplace/AnimalSafetyNotice'
import AnimalsFilters from '../components/marketplace/AnimalsFilters'
import { MarketplaceHero, QuickFilterChips } from '../components/marketplace/MarketplaceCommon'
import CollapsiblePanel from '../components/ui/CollapsiblePanel'
import { useAnimalsMarketplace } from '../hooks/useAnimalsMarketplace'
import { useMarketplaceCreateIntent } from '../hooks/useMarketplaceCreateIntent'
import { useI18n } from '../hooks/useI18n'

function AnimalsMarketplacePage() {
  const { t } = useI18n()
  const marketplace = useAnimalsMarketplace()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const openCreatePanel = useCallback(() => setIsCreateOpen(true), [])
  const createPanelRef = useMarketplaceCreateIntent({ onOpen: openCreatePanel })

  return (
    <section className="space-y-6">
      <MarketplaceHero
        active="animals"
        title={t('marketplace.animalsHeroTitle')}
        description={t('marketplace.animalsHeroDescription')}
        imageSrc={animalFamilyImage}
        imageAlt={t('marketplace.animalsImageAlt')}
        imageClass="mx-auto h-24 w-auto object-contain sm:h-28"
        stats={[
          { label: t('common.visibleListings'), value: marketplace.animals.length },
          { label: t('common.filtersActive'), value: marketplace.activeFiltersCount },
        ]}
      />

      <AnimalSafetyNotice />

      <QuickFilterChips
        chips={[
          {
            key: 'all',
            label: t('common.all'),
            active: marketplace.activeFiltersCount === 0,
            onClick: marketplace.handleResetFilters,
          },
          {
            key: 'dogs',
            label: t('animals.labels.dog'),
            active: marketplace.filters.category === 'dog',
            onClick: () => marketplace.applyQuickFilter('category', 'dog'),
          },
          {
            key: 'cats',
            label: t('animals.labels.cat'),
            active: marketplace.filters.category === 'cat',
            onClick: () => marketplace.applyQuickFilter('category', 'cat'),
          },
          {
            key: 'available',
            label: t('animals.labels.available'),
            active: marketplace.filters.listing_status === 'available',
            onClick: () => marketplace.applyQuickFilter('listing_status', 'available'),
          },
          {
            key: 'adoption',
            label: t('animals.adoption'),
            active: marketplace.filters.adoption === '1',
            onClick: () => marketplace.applyQuickFilter('adoption', '1'),
          },
        ]}
      />

      <AnimalsFilters
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
          kicker={t('common.animals')}
          title={marketplace.editingId ? t('creation.editMode') : t('creation.addAnimal')}
          description={t('marketplace.creationPanelDescription')}
          summary={marketplace.editingId ? t('creation.editMode') : t('creation.addAnimal')}
          isOpen={isCreateOpen || Boolean(marketplace.editingId)}
          onToggle={() => setIsCreateOpen((current) => !current)}
          showLabel={t('creation.addAnimal')}
          hideLabel={t('creation.hideForm')}
        >
          <AnimalListingForm
            form={marketplace.form}
            editingId={marketplace.editingId}
            isSubmitting={marketplace.isSubmitting}
            photoFile={marketplace.photoFile}
            galleryFiles={marketplace.galleryFiles}
            existingPreviewUrls={marketplace.existingPreviewUrls}
            onCancelEdit={marketplace.resetForm}
            onFormChange={marketplace.handleFormChange}
            onGalleryFilesChange={marketplace.setGalleryFiles}
            onPhotoFileChange={marketplace.setPhotoFile}
            onSubmit={marketplace.handleSubmit}
          />
        </CollapsiblePanel>
      </div>

      <MarketplaceGrid
        isLoading={marketplace.isLoading}
        items={marketplace.animals}
        loadingText={t('marketplace.loadingAnimals')}
        emptyText={t('marketplace.emptyAnimals')}
        renderItem={(animal) => (
          <AnimalCard
            key={animal.id}
            animal={animal}
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
            key={`animal-marketplace-skeleton-${index}`}
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

export default AnimalsMarketplacePage
