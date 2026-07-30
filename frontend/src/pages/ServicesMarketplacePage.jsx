import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import PropTypes from 'prop-types'

import { createServiceRequest, getServicesRequest } from '../api/services'
import ServiceCard from '../components/marketplace/ServiceCard'
import { MarketplaceHero, QuickFilterChips } from '../components/marketplace/MarketplaceCommon'
import CollapsiblePanel from '../components/ui/CollapsiblePanel'
import SkeletonBlock from '../components/ui/SkeletonBlock'
import trainerHeroImage from '../assets/images/dresseur.png'
import { useAuth } from '../hooks/useAuth'
import { useMarketplaceCreateIntent } from '../hooks/useMarketplaceCreateIntent'
import { useI18n } from '../hooks/useI18n'

const defaultServiceForm = {
  type: 'pet_sitting',
  title: '',
  description: '',
  city: '',
  address: '',
  price: '',
  price_type: 'negotiable',
  contact_visibility: 'messages_only',
  contact_phone: '',
  contact_email: '',
  whatsapp_enabled: false,
}

function ServicesMarketplacePage() {
  const { t } = useI18n()
  const { isAuthenticated, isBootstrapping } = useAuth()
  const [services, setServices] = useState([])
  const [type, setType] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [serviceForm, setServiceForm] = useState(defaultServiceForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const activeFiltersCount = type ? 1 : 0
  const openCreatePanel = useCallback(() => setIsCreateOpen(true), [])
  const selectRequestedServiceType = useCallback((requestedType) => {
    setServiceForm((current) => ({ ...current, type: requestedType }))
  }, [])
  const createPanelRef = useMarketplaceCreateIntent({
    onOpen: openCreatePanel,
    onServiceType: selectRequestedServiceType,
  })

  const loadServices = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await getServicesRequest(type ? { type } : {})
      setServices(response.data.data ?? [])
    } catch {
      setError(t('errors.generic'))
    } finally {
      setIsLoading(false)
    }
  }, [type, t])

  useEffect(() => {
    void loadServices()
  }, [loadServices])

  const handleFormChange = (field) => (event) => {
    const value = event.target.value

    setServiceForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleCreateService = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const title = serviceForm.title.trim()
    const description = serviceForm.description.trim()

    if (!title || !description) {
      setError(t('services.requiredFields'))
      return
    }

    const payload = {
      type: serviceForm.type,
      title,
      description,
      price_type: serviceForm.price_type,
      contact_visibility: serviceForm.contact_visibility,
      whatsapp_enabled: serviceForm.contact_visibility === 'whatsapp',
    }

    const optionalFields = {
      city: serviceForm.city.trim(),
      address: serviceForm.address.trim(),
      contact_phone: serviceForm.contact_phone.trim(),
      contact_email: serviceForm.contact_email.trim(),
    }

    Object.entries(optionalFields).forEach(([field, value]) => {
      if (value) {
        payload[field] = value
      }
    })

    if (serviceForm.price !== '') {
      payload.price = Number(serviceForm.price)
    }

    setIsSubmitting(true)

    try {
      await createServiceRequest(payload)
      setServiceForm(defaultServiceForm)
      setIsCreateOpen(false)
      setSuccess(t('services.created'))
      await loadServices()
    } catch {
      setError(t('services.createFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="space-y-6">
      <MarketplaceHero
        active="services"
        title={t('services.marketplaceTitle')}
        description={t('services.marketplaceDescription')}
        imageSrc={trainerHeroImage}
        imageAlt={t('services.marketplaceTitle')}
        imageClass="mx-auto h-24 w-auto rounded-[20px] object-cover sm:h-28 xl:w-[180px]"
        stats={[
          { label: t('services.visibleServices'), value: services.length },
          { label: t('services.assistance'), value: t('services.petSitting') },
        ]}
      />

      <QuickFilterChips
        chips={[
          { key: 'all', label: t('common.all'), active: !type, onClick: () => setType('') },
          { key: 'pet_sitting', label: t('services.petSitting'), active: type === 'pet_sitting', onClick: () => setType(type === 'pet_sitting' ? '' : 'pet_sitting') },
          { key: 'training', label: t('services.training'), active: type === 'training', onClick: () => setType(type === 'training' ? '' : 'training') },
        ]}
      />

      <div ref={createPanelRef}>
        <CollapsiblePanel
          kicker={t('services.publish')}
          title={t('services.add')}
          description={isAuthenticated ? t('services.createHint') : t('services.signInToPublish')}
          summary={isAuthenticated ? t('services.create') : t('common.login')}
          isOpen={isCreateOpen}
          onToggle={() => setIsCreateOpen((current) => !current)}
          showLabel={t('services.add')}
          hideLabel={t('common.hide')}
        >
        {!isBootstrapping && !isAuthenticated ? (
          <div className="rounded-[24px] border border-violet-100 bg-violet-50/70 px-5 py-5 text-sm text-stone-700 dark:border-violet-300/18 dark:bg-white/10 dark:text-violet-50">
            <p>{t('services.signInToPublish')}</p>
            <Link
              to="/login"
              className="mt-4 inline-flex rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
            >
              {t('common.login')}
            </Link>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={handleCreateService}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('services.title')} value={serviceForm.title} onChange={handleFormChange('title')} required />
              <SelectField
                label={t('services.category')}
                value={serviceForm.type}
                onChange={handleFormChange('type')}
                options={[
                  { value: 'pet_sitting', label: t('services.petSitting') },
                  { value: 'training', label: t('services.training') },
                ]}
              />
              <Field label={t('services.city')} value={serviceForm.city} onChange={handleFormChange('city')} />
              <Field label={t('services.address')} value={serviceForm.address} onChange={handleFormChange('address')} />
              <Field label={t('services.price')} type="number" min="0" step="0.01" value={serviceForm.price} onChange={handleFormChange('price')} />
              <SelectField
                label={t('services.priceType')}
                value={serviceForm.price_type}
                onChange={handleFormChange('price_type')}
                options={[
                  { value: 'negotiable', label: t('services.priceTypes.negotiable') },
                  { value: 'fixed', label: t('services.priceTypes.fixed') },
                  { value: 'hourly', label: t('services.priceTypes.hourly') },
                  { value: 'daily', label: t('services.priceTypes.daily') },
                  { value: 'session', label: t('services.priceTypes.session') },
                ]}
              />
              <SelectField
                label={t('marketplaceContact.visibilityLabel')}
                value={serviceForm.contact_visibility}
                onChange={handleFormChange('contact_visibility')}
                options={[
                  { value: 'messages_only', label: t('marketplaceContact.modes.messagesOnly') },
                  { value: 'phone', label: t('marketplaceContact.modes.phone') },
                  { value: 'email', label: t('marketplaceContact.modes.email') },
                  { value: 'whatsapp', label: t('marketplaceContact.modes.whatsapp') },
                ]}
              />
              {['phone', 'whatsapp'].includes(serviceForm.contact_visibility) ? (
                <Field label={t('marketplaceContact.phoneLabel')} dir="ltr" value={serviceForm.contact_phone} onChange={handleFormChange('contact_phone')} required />
              ) : null}
              {serviceForm.contact_visibility === 'email' ? (
                <Field label={t('marketplaceContact.emailLabel')} dir="ltr" type="email" value={serviceForm.contact_email} onChange={handleFormChange('contact_email')} required />
              ) : null}
            </div>
            <p className="rounded-[20px] border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-950 dark:border-violet-300/18 dark:bg-violet-400/10 dark:text-violet-100">
              {t('marketplaceContact.help')}
            </p>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-50">
                {t('services.description')}
              </span>
              <textarea
                rows={4}
                value={serviceForm.description}
                onChange={handleFormChange('description')}
                required
                className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-white/8 dark:text-white"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
              >
                {isSubmitting ? t('common.sending') : t('services.save')}
              </button>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full border border-violet-100 bg-white px-5 py-2.5 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 dark:border-violet-300/18 dark:bg-white/8 dark:text-violet-50"
              >
                {t('services.cancel')}
              </button>
            </div>
          </form>
        )}
        </CollapsiblePanel>
      </div>

      <CollapsiblePanel
        kicker={t('services.assistance')}
        title={t('services.filtersTitle')}
        description={t('services.filtersDescription')}
        summary={activeFiltersCount > 0 ? t('services.activeFilters', { count: activeFiltersCount }) : t('services.noActiveFilters')}
        isOpen={isFiltersOpen}
        onToggle={() => setIsFiltersOpen((current) => !current)}
      >
        <div className="flex flex-wrap gap-2">
          <FilterButton active={!type} onClick={() => setType('')}>{t('common.all')}</FilterButton>
          <FilterButton active={type === 'pet_sitting'} onClick={() => setType('pet_sitting')}>{t('services.petSitting')}</FilterButton>
          <FilterButton active={type === 'training'} onClick={() => setType('training')}>{t('services.training')}</FilterButton>
        </div>
      </CollapsiblePanel>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
      ) : null}

      {success ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{success}</div>
      ) : null}

      {isLoading ? (
        <SkeletonBlock count={4} label={t('common.loading')} variant="services" />
      ) : null}

      {!isLoading && services.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-violet-200 bg-white/84 px-5 py-12 text-center text-sm text-stone-500 dark:border-violet-300/20 dark:bg-white/10 dark:text-violet-100">
          <p>{t('services.empty')}</p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 rounded-full bg-[linear-gradient(135deg,#7c3aed,#a855f7)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
          >
            {t('services.add')}
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </section>
  )
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-50">{label}</span>
      <input
        className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-white/8 dark:text-white"
        {...props}
      />
    </label>
  )
}

function SelectField({ label, options, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-stone-700 dark:text-violet-50">{label}</span>
      <select
        className="w-full rounded-2xl border border-violet-100 bg-violet-50/55 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-violet-400 focus:bg-white dark:border-violet-300/18 dark:bg-white/8 dark:text-white"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-[linear-gradient(135deg,#7c3aed,#a855f7)] text-white'
          : 'border border-violet-100 bg-white/80 text-violet-900 hover:bg-violet-50 dark:border-violet-300/18 dark:bg-white/8 dark:text-violet-50'
      }`}
    >
      {children}
    </button>
  )
}

FilterButton.propTypes = {
  active: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.node,
}

Field.propTypes = {
  label: PropTypes.string,
}

SelectField.propTypes = {
  label: PropTypes.string,
  options: PropTypes.array,
}

export default ServicesMarketplacePage
