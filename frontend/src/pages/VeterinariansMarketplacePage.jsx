import { uploadError } from '../utils/uploadValidation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createVeterinarianRequest, listVeterinariansRequest, updateVeterinarianRequest, deleteVeterinarianRequest } from '../api/veterinarians'
import OwnerListingActions from '../components/marketplace/OwnerListingActions'
import VeterinarianCard from '../components/marketplace/VeterinarianCard'
import { Field, MarketplaceHero, QuickFilterChips } from '../components/marketplace/MarketplaceCommon'
import Button from '../components/ui/Button'
import CollapsiblePanel from '../components/ui/CollapsiblePanel'
import SkeletonBlock from '../components/ui/SkeletonBlock'
import veterinarianHeroImage from '../assets/images/vétérinaire.png'
import { useAuth } from '../hooks/useAuth'
import { useMarketplaceCreateIntent } from '../hooks/useMarketplaceCreateIntent'
import { useI18n } from '../hooks/useI18n'
import { getErrorMessage } from '../utils/getErrorMessage'

const initialForm = {
  name: '',
  clinic_name: '',
  description: '',
  city: '',
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  specialties: '',
  working_hours: '',
  latitude: '',
  longitude: '',
  location_url: '',
}

function VeterinariansMarketplacePage() {
  const { t } = useI18n()
  const { isAuthenticated } = useAuth()
  const mutationLock = useRef(false)
  const [editingId, setEditingId] = useState(null)
  const [veterinarians, setVeterinarians] = useState([])
  const [filters, setFilters] = useState({ search: '', city: '', specialty: '' })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [isLoading, setIsLoading] = useState(true)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [imageFile, setImageFile] = useState(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [formError, setFormError] = useState('')
  const openCreatePanel = useCallback(() => setIsCreateOpen(true), [])
  const createPanelRef = useMarketplaceCreateIntent({ onOpen: openCreatePanel })

  const activeFiltersCount = useMemo(
    () => Object.values(appliedFilters).filter(Boolean).length,
    [appliedFilters],
  )

  useEffect(() => {
    let isMounted = true

    async function loadVeterinarians() {
      setIsLoading(true)
      setError('')

      try {
        const response = await listVeterinariansRequest(cleanFilters(appliedFilters))
        if (isMounted) {
          setVeterinarians(response.data.data ?? [])
        }
      } catch {
        if (isMounted) {
          setError(t('errors.generic'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadVeterinarians()

    return () => {
      isMounted = false
    }
  }, [appliedFilters, t])

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSearch = (event) => {
    event.preventDefault()
    setAppliedFilters(filters)
  }

  const handleReset = () => {
    const nextFilters = { search: '', city: '', specialty: '' }
    setFilters(nextFilters)
    setAppliedFilters(nextFilters)
  }

  const applyQuickFilter = (field, value) => {
    const nextFilters = {
      ...filters,
      [field]: appliedFilters[field] === value ? '' : value,
    }

    setFilters(nextFilters)
    setAppliedFilters(nextFilters)
  }

  const refreshVeterinarians = async () => {
    const response = await listVeterinariansRequest(cleanFilters(appliedFilters))
    setVeterinarians(response.data.data ?? [])
  }

  const handleFormChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (mutationLock.current) return
    const uploadIssue = uploadError(imageFile)
    if (uploadIssue) { setFormError(t(uploadIssue)); return }
    setFormError('')
    setSuccessMessage('')

    if (!form.name.trim()) {
      setFormError(t('veterinarians.nameRequired'))
      return
    }

    if (form.latitude && Number.isNaN(Number(form.latitude))) {
      setFormError(t('veterinarians.invalidCoordinates'))
      return
    }

    if (form.longitude && Number.isNaN(Number(form.longitude))) {
      setFormError(t('veterinarians.invalidCoordinates'))
      return
    }

    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      const trimmed = String(value ?? '').trim()
      if (!trimmed || key === 'specialties' || key === 'working_hours') return
      payload.append(key, trimmed)
    })

    splitList(form.specialties).forEach((specialty) => {
      payload.append('specialties[]', specialty)
    })

    splitList(form.working_hours).forEach((hour) => {
      payload.append('working_hours[]', hour)
    })

    if (imageFile) {
      payload.append('image', imageFile)
    }

    mutationLock.current = true
    setIsSubmitting(true)

    try {
      if (editingId) {
        if (imageFile) { payload.set('_method', 'PATCH'); await updateVeterinarianRequest(editingId, payload) }
        else await updateVeterinarianRequest(editingId, { ...Object.fromEntries(Object.entries(form).filter(([key]) => !['specialties', 'working_hours'].includes(key)).map(([key, value]) => [key, String(value ?? '').trim() || null])), specialties: splitList(form.specialties), working_hours: splitList(form.working_hours) })
      } else await createVeterinarianRequest(payload)
      setEditingId(null)
      await refreshVeterinarians()
      setForm(initialForm)
      setImageFile(null)
      setIsCreateOpen(false)
      setSuccessMessage(t(editingId ? 'veterinarians.updated' : 'veterinarians.created'))
    } catch (error) {
      setFormError(getErrorMessage(error, t('veterinarians.createError')))
    } finally {
      mutationLock.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <section className="space-y-6">
      <MarketplaceHero
        active="veterinarians"
        title={t('veterinarians.title')}
        description={t('veterinarians.subtitle')}
        imageSrc={veterinarianHeroImage}
        imageAlt={t('veterinarians.title')}
        imageClass="mx-auto h-24 w-auto rounded-[20px] object-cover sm:h-28 xl:w-[180px]"
        stats={[
          { label: t('veterinarians.visibleVeterinarians'), value: veterinarians.length },
          { label: t('common.filtersActive'), value: activeFiltersCount },
        ]}
      />

      <QuickFilterChips
        chips={[
          { key: 'all', label: t('common.all'), active: activeFiltersCount === 0, onClick: handleReset },
          { key: 'casablanca', label: t('marketplace.quickFilters.casablanca'), active: appliedFilters.city === 'Casablanca', onClick: () => applyQuickFilter('city', 'Casablanca') },
          { key: 'rabat', label: t('marketplace.quickFilters.rabat'), active: appliedFilters.city === 'Rabat', onClick: () => applyQuickFilter('city', 'Rabat') },
          { key: 'cats', label: t('animals.labels.cat'), active: appliedFilters.specialty === t('animals.labels.cat'), onClick: () => applyQuickFilter('specialty', t('animals.labels.cat')) },
          { key: 'dogs', label: t('animals.labels.dog'), active: appliedFilters.specialty === t('animals.labels.dog'), onClick: () => applyQuickFilter('specialty', t('animals.labels.dog')) },
        ]}
      />

      {isAuthenticated ? (
        <div ref={createPanelRef}>
          <CollapsiblePanel
            kicker={t('veterinarians.title')}
            title={t('veterinarians.createListing')}
            description={t('veterinarians.clinicInformation')}
            summary={t('veterinarians.addListing')}
            isOpen={isCreateOpen}
            onToggle={() => setIsCreateOpen((current) => !current)}
            showLabel={t('veterinarians.addListing')}
            hideLabel={t('creation.hideForm')}
          >
            {editingId ? <Button type="button" disabled={isSubmitting} variant="ghost" onClick={() => { setEditingId(null); setForm(initialForm); setImageFile(null) }}>{t('common.cancel')}</Button> : null}
            <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={t('veterinarians.name')} maxLength={255} value={form.name} onChange={handleFormChange('name')} required />
              <Field label={t('veterinarians.clinicName')} maxLength={255} value={form.clinic_name} onChange={handleFormChange('clinic_name')} />
              <Field label={t('veterinarians.city')} maxLength={120} value={form.city} onChange={handleFormChange('city')} />
              <Field label={t('veterinarians.address')} maxLength={500} value={form.address} onChange={handleFormChange('address')} />
              <Field label={t('veterinarians.phone')} maxLength={50} value={form.phone} onChange={handleFormChange('phone')} dir="ltr" />
              <Field label={t('veterinarians.whatsapp')} maxLength={50} value={form.whatsapp} onChange={handleFormChange('whatsapp')} dir="ltr" />
              <Field label={t('veterinarians.email')} type="email" maxLength={255} value={form.email} onChange={handleFormChange('email')} dir="ltr" />
              <Field label={t('veterinarians.specialties')} value={form.specialties} onChange={handleFormChange('specialties')} placeholder={t('veterinarians.specialtiesPlaceholder')} />
              <Field label={t('veterinarians.workingHours')} value={form.working_hours} onChange={handleFormChange('working_hours')} placeholder={t('veterinarians.workingHoursPlaceholder')} />
              <Field label={t('veterinarians.locationUrl')} type="url" maxLength={1000} value={form.location_url} onChange={handleFormChange('location_url')} dir="ltr" />
              <Field label={t('veterinarians.latitude')} value={form.latitude} onChange={handleFormChange('latitude')} dir="ltr" />
              <Field label={t('veterinarians.longitude')} value={form.longitude} onChange={handleFormChange('longitude')} dir="ltr" />
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-100">
                {t('veterinarians.image')}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 file:me-4 file:rounded-full file:border-0 file:bg-[linear-gradient(135deg,#7c3aed,#a855f7)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-100">
                {t('veterinarians.description')}
              </span>
              <textarea
                maxLength={3000} value={form.description}
                onChange={handleFormChange('description')}
                rows={4}
                className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50"
              />
            </label>
            {formError ? (
              <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('common.sending') : t(editingId ? 'common.save' : 'veterinarians.create')}
              </Button>
            </div>
            </form>
          </CollapsiblePanel>
        </div>
      ) : null}

      <CollapsiblePanel
        kicker={t('veterinarians.title')}
        title={t('veterinarians.filtersTitle')}
        description={t('veterinarians.filtersDescription')}
        summary={activeFiltersCount > 0 ? t('marketplace.filtersSummaryCount', { count: activeFiltersCount, plural: activeFiltersCount > 1 ? 's' : '' }) : t('marketplace.filtersSummaryEmpty')}
        isOpen={isFiltersOpen}
        onToggle={() => setIsFiltersOpen((current) => !current)}
      >
        <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSearch}>
          <Field
            label={t('common.search')}
            value={filters.search}
            onChange={handleFilterChange('search')}
            placeholder={t('veterinarians.searchPlaceholder')}
          />
          <Field
            label={t('veterinarians.city')}
            value={filters.city}
            onChange={handleFilterChange('city')}
            placeholder={t('veterinarians.cityFilter')}
          />
          <Field
            label={t('veterinarians.specialties')}
            value={filters.specialty}
            onChange={handleFilterChange('specialty')}
            placeholder={t('veterinarians.specialtyPlaceholder')}
          />
          <div className="flex flex-wrap gap-2 md:col-span-3">
            <button
              type="submit"
              className="rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-5 py-2 text-sm font-semibold text-white"
            >
              {t('common.applyFilters')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-violet-100 bg-white/80 px-5 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-50 dark:border-violet-300/18 dark:bg-white/8 dark:text-violet-50"
            >
              {t('common.reset')}
            </button>
          </div>
        </form>
      </CollapsiblePanel>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
      ) : null}

      {successMessage ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{successMessage}</div>
      ) : null}

      {isLoading ? (
        <SkeletonBlock count={4} label={t('veterinarians.loading')} variant="veterinarians" />
      ) : null}

      {!isLoading && veterinarians.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-violet-200 bg-white/84 px-5 py-12 text-center text-sm text-stone-500 dark:border-violet-300/20 dark:bg-white/10 dark:text-violet-100">
          <p>{t('veterinarians.empty')}</p>
          <p className="mt-2 font-semibold text-violet-800 dark:text-violet-100">
            {t('veterinarians.beFirst')}
          </p>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {veterinarians.map((veterinarian) => (
          <div key={veterinarian.id}>
            <VeterinarianCard veterinarian={veterinarian} />
            {veterinarian.isOwner ? <OwnerListingActions disabled={isSubmitting} onEdit={() => {
              setEditingId(veterinarian.id)
              setForm({ ...initialForm, name: veterinarian.name, clinic_name: veterinarian.clinicName ?? '', description: veterinarian.description ?? '', city: veterinarian.city ?? '', address: veterinarian.address ?? '', phone: veterinarian.phone ?? '', whatsapp: veterinarian.whatsapp ?? '', email: veterinarian.email ?? '', specialties: (veterinarian.specialties ?? []).join(', '), working_hours: (veterinarian.workingHours ?? []).join(', '), latitude: veterinarian.latitude ?? '', longitude: veterinarian.longitude ?? '', location_url: veterinarian.locationUrl ?? '' })
              setImageFile(null)
              setIsCreateOpen(true)
              createPanelRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
            }} onDelete={async () => { await deleteVeterinarianRequest(veterinarian.id); setVeterinarians(current => current.filter(item => item.id !== veterinarian.id)); if (editingId === veterinarian.id) { setEditingId(null); setForm(initialForm); setImageFile(null) } }} /> : null}
          </div>
        ))}
      </div>
    </section>
  )
}

function cleanFilters(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => String(value ?? '').trim() !== ''),
  )
}

function splitList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export default VeterinariansMarketplacePage
