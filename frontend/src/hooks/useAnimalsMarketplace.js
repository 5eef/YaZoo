import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { defaultAnimalFilters, defaultAnimalForm } from '../features/marketplace/marketplaceOptions'
import {
  buildAnimalFormData,
  countActiveFilters,
  uniqueUrls,
} from '../features/marketplace/marketplaceUtils'
import * as animalService from '../services/marketplace/animalsMarketplaceService'
import { asArray } from '../utils/apiData'
import { getErrorMessage } from '../utils/getErrorMessage'
import { useI18n } from './useI18n'

const cloneAnimalForm = () => ({
  ...defaultAnimalForm,
  existing_gallery_paths: [],
  existing_gallery_urls: [],
})

export function useAnimalsMarketplace() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('q') ?? ''
  const [animals, setAnimals] = useState([])
  const [filters, setFilters] = useState(() => ({
    ...defaultAnimalFilters,
    q: queryFromUrl,
  }))
  const [form, setForm] = useState(cloneAnimalForm)
  const [photoFile, setPhotoFile] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  const loadAnimals = useCallback(async (activeFilters = filters) => {
    try {
      const nextAnimals = await animalService.fetchAnimals(activeFilters)

      setAnimals(nextAnimals)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('animals.loadError')),
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters, t])

  useEffect(() => {
    let cancelled = false

    const loadInitialAnimals = async () => {
      try {
        const nextAnimals = await animalService.fetchAnimals()

        if (!cancelled) {
          setAnimals(nextAnimals)
          setErrorMessage('')
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            getErrorMessage(error, t('animals.loadError')),
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadInitialAnimals()

    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    setFilters((current) => {
      if (current.q === queryFromUrl) {
        return current
      }

      return { ...current, q: queryFromUrl }
    })

    setIsLoading(true)
    loadAnimals({ ...filters, q: queryFromUrl })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryFromUrl])

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleFormChange = (field) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value

    setForm((current) => ({ ...current, [field]: value }))
  }

  const resetForm = () => {
    setForm(cloneAnimalForm())
    setPhotoFile(null)
    setGalleryFiles([])
    setEditingId(null)
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    if (filters.q.trim()) {
      setSearchParams({ q: filters.q.trim() })
    } else {
      setSearchParams({})
    }
    setIsLoading(true)
    await loadAnimals(filters)
  }

  const handleResetFilters = async () => {
    setFilters(defaultAnimalFilters)
    setSearchParams({})
    setIsLoading(true)
    await loadAnimals(defaultAnimalFilters)
  }

  const applyQuickFilter = async (field, value) => {
    const nextFilters = {
      ...filters,
      [field]: filters[field] === value ? '' : value,
    }

    setFilters(nextFilters)
    setIsLoading(true)
    await loadAnimals(nextFilters)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    if (!form.accepts_animal_rules) {
      setErrorMessage(t('animals.rulesRequiredError'))
      return
    }

    setIsSubmitting(true)

    try {
      const payload = buildAnimalFormData(form, photoFile, galleryFiles)

      if (editingId) {
        await animalService.updateAnimal(editingId, payload)
        setSuccessMessage(t('animals.updateSuccess'))
      } else {
        await animalService.createAnimal(payload)
        setSuccessMessage(t('animals.createSuccess'))
      }

      resetForm()
      await loadAnimals(filters)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('animals.saveError')),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (animal) => {
    setEditingId(animal.id)
    setPhotoFile(null)
    setGalleryFiles([])
    setForm({
      ...cloneAnimalForm(),
      name: animal.name ?? '',
      category: animal.category ?? 'other',
      type: animal.type ?? '',
      breed: animal.breed ?? '',
      age: animal.age ?? '',
      sex: animal.sex ?? 'unknown',
      location: animal.location ?? '',
      contact_phone: animal.contactPhone ?? '',
      price: animal.price ?? '',
      is_for_adoption: animal.isForAdoption ?? false,
      accepts_animal_rules: animal.acceptsAnimalRules ?? false,
      listing_status: animal.listingStatus ?? 'available',
      description: animal.description ?? '',
      seller_type: animal.sellerType ?? 'individual',
      origin: animal.origin ?? '',
      identification_number: animal.identificationNumber ?? '',
      health_certificate_path: animal.healthCertificatePath ?? '',
      vaccination_book_path: animal.vaccinationBookPath ?? '',
      onssa_authorization_number: animal.onssaAuthorizationNumber ?? '',
      existing_photo_path: animal.photoPath ?? '',
      existing_photo_url: animal.photoUrl ?? '',
      existing_gallery_paths: animal.galleryPaths ?? [],
      existing_gallery_urls: animal.galleryUrls ?? [],
    })
    setSuccessMessage('')
    setErrorMessage('')
  }

  const handleDelete = async (animalId) => {
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await animalService.deleteAnimal(animalId)
      setAnimals((current) => asArray(current).filter((animal) => animal.id !== animalId))
      if (editingId === animalId) resetForm()
      setSuccessMessage(t('animals.deleteSuccess'))
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('animals.deleteError')),
      )
    }
  }

  return {
    animals,
    filters,
    form,
    galleryFiles,
    photoFile,
    editingId,
    errorMessage,
    successMessage,
    isLoading,
    isSubmitting,
    isFiltersOpen,
    activeFiltersCount: countActiveFilters(filters),
    existingPreviewUrls: uniqueUrls([form.existing_photo_url, ...form.existing_gallery_urls]),
    setGalleryFiles,
    setPhotoFile,
    setIsFiltersOpen,
    handleDelete,
    handleEdit,
    handleFilterChange,
    handleFormChange,
    handleResetFilters,
    applyQuickFilter,
    handleSearch,
    handleSubmit,
    resetForm,
  }
}
