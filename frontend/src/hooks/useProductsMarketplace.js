import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { defaultProductFilters, defaultProductForm } from '../features/marketplace/marketplaceOptions'
import {
  buildProductFormData,
  countActiveFilters,
  uniqueUrls,
} from '../features/marketplace/marketplaceUtils'
import * as productService from '../services/marketplace/productsMarketplaceService'
import { asArray } from '../utils/apiData'
import { getErrorMessage } from '../utils/getErrorMessage'

const cloneProductForm = () => ({
  ...defaultProductForm,
  existing_gallery_paths: [],
  existing_gallery_urls: [],
})

export function useProductsMarketplace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('q') ?? ''
  const [products, setProducts] = useState([])
  const [filters, setFilters] = useState(() => ({
    ...defaultProductFilters,
    q: queryFromUrl,
  }))
  const [form, setForm] = useState(cloneProductForm)
  const [imageFile, setImageFile] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  const loadProducts = useCallback(async (activeFilters = filters) => {
    try {
      const nextProducts = await productService.fetchProducts(activeFilters)

      setProducts(nextProducts)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Impossible de charger les produits du marketplace.'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    let cancelled = false

    const loadInitialProducts = async () => {
      try {
        const nextProducts = await productService.fetchProducts()

        if (!cancelled) {
          setProducts(nextProducts)
          setErrorMessage('')
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            getErrorMessage(error, 'Impossible de charger les produits du marketplace.'),
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadInitialProducts()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setFilters((current) => {
      if (current.q === queryFromUrl) {
        return current
      }

      return { ...current, q: queryFromUrl }
    })

    setIsLoading(true)
    loadProducts({ ...filters, q: queryFromUrl })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryFromUrl])

  const handleFilterChange = (field) => (event) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleFormChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const resetForm = () => {
    setForm(cloneProductForm())
    setImageFile(null)
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
    await loadProducts(filters)
  }

  const handleResetFilters = async () => {
    setFilters(defaultProductFilters)
    setSearchParams({})
    setIsLoading(true)
    await loadProducts(defaultProductFilters)
  }

  const applyQuickFilter = async (field, value) => {
    const nextFilters = {
      ...filters,
      [field]: filters[field] === value ? '' : value,
    }

    setFilters(nextFilters)
    setIsLoading(true)
    await loadProducts(nextFilters)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const payload = buildProductFormData(form, imageFile, galleryFiles)

      if (editingId) {
        await productService.updateProduct(editingId, payload)
        setSuccessMessage('Produit mis a jour.')
      } else {
        await productService.createProduct(payload)
        setSuccessMessage('Produit cree avec succes.')
      }

      resetForm()
      await loadProducts(filters)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Impossible d'enregistrer le produit."),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (product) => {
    setEditingId(product.id)
    setImageFile(null)
    setGalleryFiles([])
    setForm({
      ...cloneProductForm(),
      name: product.name ?? '',
      category: product.category ?? 'other',
      description: product.description ?? '',
      price: product.price ?? '',
      location: product.location ?? '',
      stock: product.stock ?? 1,
      listing_status: product.listingStatus ?? 'available',
      condition_status: product.conditionStatus ?? 'new',
      existing_image_path: product.imagePath ?? '',
      existing_image_url: product.imageUrl ?? '',
      existing_gallery_paths: product.galleryPaths ?? [],
      existing_gallery_urls: product.galleryUrls ?? [],
    })
    setSuccessMessage('')
    setErrorMessage('')
  }

  const handleDelete = async (productId) => {
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await productService.deleteProduct(productId)
      setProducts((current) => asArray(current).filter((product) => product.id !== productId))
      if (editingId === productId) resetForm()
      setSuccessMessage('Produit supprime.')
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Impossible de supprimer le produit.'),
      )
    }
  }

  return {
    products,
    filters,
    form,
    imageFile,
    galleryFiles,
    editingId,
    errorMessage,
    successMessage,
    isLoading,
    isSubmitting,
    isFiltersOpen,
    activeFiltersCount: countActiveFilters(filters),
    existingPreviewUrls: uniqueUrls([form.existing_image_url, ...form.existing_gallery_urls]),
    setGalleryFiles,
    setImageFile,
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
