import PropTypes from 'prop-types'
import { Link } from 'react-router'

import Button from '../ui/Button'
import { Field, FileField, SelectField } from './MarketplaceCommon'
import {
  animalFormCategoryOptions,
  animalFormStatusOptions,
  animalSellerTypeOptions,
  contactVisibilityOptions,
} from '../../features/marketplace/marketplaceOptions'
import { useI18n } from '../../hooks/useI18n'

function AnimalListingForm({
  form,
  editingId,
  isSubmitting,
  photoFile,
  galleryFiles,
  existingPreviewUrls,
  onCancelEdit,
  onFormChange,
  onGalleryFilesChange,
  onPhotoFileChange,
  onSubmit,
}) {
  const { t } = useI18n()
  const submitLabel = getSubmitLabel(isSubmitting, editingId, t)

  return (
    <form onSubmit={onSubmit} className="rounded-[30px] border border-white/80 bg-white/92 p-4 shadow-[0_20px_48px_rgba(124,58,237,0.08)] dark:border-violet-300/14 dark:bg-white/8 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">{t('common.publication')}</p>
          <h2 className="mt-2 text-xl font-semibold text-stone-950 dark:text-violet-50">
            {editingId ? t('animals.formTitleEdit') : t('animals.formTitleCreate')}
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-violet-100/70">
            {t('animals.formDescription')}
          </p>
        </div>

        {editingId ? (
          <Button type="button" variant="ghost" onClick={onCancelEdit}>{t('common.cancel')}</Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label={t('common.name')} value={form.name} onChange={onFormChange('name')} />
        <SelectField label={t('common.category')} value={form.category} onChange={onFormChange('category')} options={animalFormCategoryOptions} />
        <Field label={t('common.type')} value={form.type} onChange={onFormChange('type')} />
        <Field label={t('common.breed')} value={form.breed} onChange={onFormChange('breed')} />
        <Field label={t('common.age')} type="number" min="0" value={form.age} onChange={onFormChange('age')} />
        <SelectField
          label={t('common.sex')}
          value={form.sex}
          onChange={onFormChange('sex')}
          options={[
            { value: 'male', labelKey: 'animals.labels.male' },
            { value: 'female', labelKey: 'animals.labels.female' },
            { value: 'unknown', labelKey: 'animals.labels.unknown' },
          ]}
        />
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
        <Field label={t('common.price')} type="number" min="0" step="0.01" value={form.price} onChange={onFormChange('price')} />
        <SelectField label={t('common.status')} value={form.listing_status} onChange={onFormChange('listing_status')} options={animalFormStatusOptions} />
        <SelectField label={t('animals.sellerType')} value={form.seller_type} onChange={onFormChange('seller_type')} options={animalSellerTypeOptions} />
        <Field label={t('animals.origin')} value={form.origin} onChange={onFormChange('origin')} />
        <Field label={t('animals.identificationNumber')} value={form.identification_number} onChange={onFormChange('identification_number')} />
        <Field label={t('animals.onssaAuthorizationNumber')} value={form.onssa_authorization_number} onChange={onFormChange('onssa_authorization_number')} />
      </div>

      <p className="mt-3 rounded-[20px] border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-950 dark:border-violet-300/18 dark:bg-violet-400/10 dark:text-violet-100">
        {t('marketplaceContact.help')}
      </p>

      <div className="mt-4 rounded-[22px] border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm leading-6 text-violet-950 dark:border-violet-300/18 dark:bg-violet-400/10 dark:text-violet-100">
        {t('animals.complianceNotice')}
      </div>

      {form.seller_type === 'professional' ? (
        <div className="mt-3 rounded-[22px] border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-300/18 dark:bg-amber-400/10 dark:text-amber-100">
          {t('animals.professionalSellerWarning')}
        </div>
      ) : null}

      <label className="mt-4 flex items-center gap-3 text-sm text-stone-700 dark:text-violet-100/78">
        <input
          type="checkbox"
          checked={form.is_for_adoption}
          onChange={onFormChange('is_for_adoption')}
          className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-400"
        />
        {t('animals.adoptionNotice')}
      </label>

      <label className="mt-4 flex items-start gap-3 rounded-[22px] border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-300/18 dark:bg-amber-400/10 dark:text-amber-100">
        <input
          type="checkbox"
          checked={form.accepts_animal_rules}
          onChange={onFormChange('accepts_animal_rules')}
          required
          className="mt-1 h-4 w-4 shrink-0 rounded border-amber-300 text-violet-600 focus:ring-violet-400"
        />
        <span>
          {t('animals.rulesAttestation')}{' '}
          <Link to="/rules" className="font-semibold text-violet-800 underline underline-offset-4 dark:text-violet-100">
            {t('animals.rulesLink')}
          </Link>
        </span>
      </label>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <FileField label={t('animals.mainImage')} accept="image/*" onChange={(event) => onPhotoFileChange(event.target.files?.[0] ?? null)} />
        <FileField label={t('animals.gallery')} accept="image/*" multiple onChange={(event) => onGalleryFilesChange(Array.from(event.target.files ?? []))} />
      </div>

      <SelectedFiles photoFile={photoFile} galleryFiles={galleryFiles} t={t} />
      <ExistingImages urls={existingPreviewUrls} t={t} />

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-100">{t('common.description')}</span>
        <textarea
          rows={4}
          value={form.description}
          onChange={onFormChange('description')}
          required
          minLength={20}
          className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
          placeholder={t('animals.descriptionPlaceholder')}
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

function SelectedFiles({ photoFile, galleryFiles, t }) {
  return (
    <>
      {photoFile ? <p className="mt-3 text-sm text-stone-500">{t('common.selectedMainImage', { name: photoFile.name })}</p> : null}
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
    return t('animals.saveProgress')
  }

  if (editingId) {
    return t('animals.updateListing')
  }

  return t('animals.publishListing')
}

AnimalListingForm.propTypes = {
  form: PropTypes.object,
  editingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isSubmitting: PropTypes.bool,
  photoFile: PropTypes.object,
  galleryFiles: PropTypes.array,
  existingPreviewUrls: PropTypes.array,
  onCancelEdit: PropTypes.func,
  onFormChange: PropTypes.func,
  onGalleryFilesChange: PropTypes.func,
  onPhotoFileChange: PropTypes.func,
  onSubmit: PropTypes.func,
}

SelectedFiles.propTypes = {
  photoFile: PropTypes.object,
  galleryFiles: PropTypes.array,
  t: PropTypes.func,
}

ExistingImages.propTypes = {
  urls: PropTypes.array,
  t: PropTypes.func,
}

export default AnimalListingForm
