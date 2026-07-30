import PropTypes from 'prop-types'

import Button from '../ui/Button'
import { Field, FileField, SelectField } from './MarketplaceCommon'
import {
  contactVisibilityOptions,
  productFormCategoryOptions,
  productFormStatusOptions,
} from '../../features/marketplace/marketplaceOptions'
import { useI18n } from '../../hooks/useI18n'

function ProductListingForm({
  form,
  editingId,
  isSubmitting,
  imageFile,
  galleryFiles,
  existingPreviewUrls,
  onCancelEdit,
  onFormChange,
  onGalleryFilesChange,
  onImageFileChange,
  onSubmit,
}) {
  const { t } = useI18n()
  const submitLabel = getSubmitLabel(isSubmitting, editingId, t)

  return (
    <form onSubmit={onSubmit} className="rounded-[30px] border border-white/80 bg-white/92 p-4 shadow-[0_20px_48px_rgba(124,58,237,0.08)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-violet-700">{t('common.publication')}</p>
          <h2 className="mt-2 text-xl font-semibold text-stone-950">
            {editingId ? t('products.formTitleEdit') : t('products.formTitleCreate')}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {t('products.formDescription')}
          </p>
        </div>

        {editingId ? (
          <Button type="button" variant="ghost" onClick={onCancelEdit}>{t('common.cancel')}</Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label={t('common.name')} value={form.name} onChange={onFormChange('name')} />
        <SelectField label={t('common.category')} value={form.category} onChange={onFormChange('category')} options={productFormCategoryOptions} />
        <Field label={t('common.price')} type="number" min="0" step="0.01" value={form.price} onChange={onFormChange('price')} />
        <Field label={t('feed.location')} value={form.location} onChange={onFormChange('location')} />
        <SelectField
          label={t('marketplaceContact.visibilityLabel')}
          value={form.contact_visibility}
          onChange={onFormChange('contact_visibility')}
          options={contactVisibilityOptions}
        />
        {['phone', 'whatsapp'].includes(form.contact_visibility) ? (
          <Field label={t('marketplaceContact.phoneLabel')} value={form.contact_phone} onChange={onFormChange('contact_phone')} required />
        ) : null}
        {form.contact_visibility === 'email' ? (
          <Field label={t('marketplaceContact.emailLabel')} type="email" value={form.contact_email} onChange={onFormChange('contact_email')} required />
        ) : null}
        <Field label={t('common.stock')} type="number" min="0" value={form.stock} onChange={onFormChange('stock')} />
        <SelectField label={t('common.status')} value={form.listing_status} onChange={onFormChange('listing_status')} options={productFormStatusOptions} />
        <SelectField
          label={t('common.condition')}
          value={form.condition_status}
          onChange={onFormChange('condition_status')}
          options={[
            { value: 'new', labelKey: 'products.labels.new' },
            { value: 'used', labelKey: 'products.labels.used' },
          ]}
        />
      </div>

      <p className="mt-3 rounded-[20px] border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-950 dark:border-violet-300/18 dark:bg-violet-400/10 dark:text-violet-100">
        {t('marketplaceContact.help')}
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <FileField label={t('products.mainImage')} accept="image/*" onChange={(event) => onImageFileChange(event.target.files?.[0] ?? null)} />
        <FileField label={t('products.gallery')} accept="image/*" multiple onChange={(event) => onGalleryFilesChange(Array.from(event.target.files ?? []))} />
      </div>

      <SelectedFiles imageFile={imageFile} galleryFiles={galleryFiles} t={t} />
      <ExistingImages urls={existingPreviewUrls} t={t} />

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-medium text-stone-700">{t('common.description')}</span>
        <textarea
          rows={4}
          value={form.description}
          onChange={onFormChange('description')}
          className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white"
          placeholder={t('products.descriptionPlaceholder')}
        />
      </label>

      <div className="mt-4 flex justify-stretch sm:justify-end">
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function SelectedFiles({ imageFile, galleryFiles, t }) {
  return (
    <>
      {imageFile ? <p className="mt-3 text-sm text-stone-500">{t('common.selectedMainImage', { name: imageFile.name })}</p> : null}
      {galleryFiles.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {galleryFiles.map((file) => (
            <span key={`${file.name}-${file.size}`} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-800">
              {file.name}
            </span>
          ))}
        </div>
      ) : null}
    </>
  )
}

function ExistingImages({ urls, t }) {
  if (urls.length === 0) return null

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-stone-700">{t('common.currentImages')}</p>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {urls.map((imageUrl) => (
          <img key={imageUrl} src={imageUrl} alt={t('common.preview')} className="h-20 w-20 rounded-2xl object-cover" />
        ))}
      </div>
    </div>
  )
}

function getSubmitLabel(isSubmitting, editingId, t) {
  if (isSubmitting) {
    return t('products.saveProgress')
  }

  if (editingId) {
    return t('products.updateProduct')
  }

  return t('products.publishProduct')
}

ProductListingForm.propTypes = {
  form: PropTypes.object,
  editingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isSubmitting: PropTypes.bool,
  imageFile: PropTypes.object,
  galleryFiles: PropTypes.array,
  existingPreviewUrls: PropTypes.array,
  onCancelEdit: PropTypes.func,
  onFormChange: PropTypes.func,
  onGalleryFilesChange: PropTypes.func,
  onImageFileChange: PropTypes.func,
  onSubmit: PropTypes.func,
}

SelectedFiles.propTypes = {
  imageFile: PropTypes.object,
  galleryFiles: PropTypes.array,
  t: PropTypes.func,
}

ExistingImages.propTypes = {
  urls: PropTypes.array,
  t: PropTypes.func,
}

export default ProductListingForm
