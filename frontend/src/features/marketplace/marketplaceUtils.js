export function cleanFilters(filters = {}) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== ''),
  )
}

export function uniqueUrls(urls) {
  return [...new Set(urls.filter(Boolean))]
}

export function countActiveFilters(filters) {
  return Object.values(filters).filter((value) => value !== '').length
}

export function formatFiltersSummary(activeFiltersCount, t = null) {
  if (activeFiltersCount === 0) {
    return t ? t('marketplace.filtersSummaryEmpty') : 'Aucun filtre actif'
  }

  const plural = activeFiltersCount > 1 ? 's' : ''

  return t
    ? t('marketplace.filtersSummaryCount', { count: activeFiltersCount, plural })
    : `${activeFiltersCount} filtre${plural} actif${plural}`
}

export function buildAnimalFormData(form, photoFile, galleryFiles) {
  const formData = new FormData()

  formData.append('name', form.name)
  formData.append('category', form.category)
  formData.append('type', form.type)
  formData.append('breed', form.breed)
  formData.append('sex', form.sex)
  formData.append('location', form.location)
  formData.append('contact_visibility', form.contact_visibility || 'messages_only')
  formData.append('contact_phone', form.contact_phone)
  formData.append('contact_email', form.contact_email)
  formData.append('whatsapp_enabled', form.contact_visibility === 'whatsapp' ? '1' : '0')
  formData.append('is_for_adoption', form.is_for_adoption ? '1' : '0')
  formData.append('accepts_animal_rules', form.accepts_animal_rules ? '1' : '0')
  formData.append('listing_status', form.listing_status)
  formData.append('description', form.description)
  formData.append('seller_type', form.seller_type || 'individual')

  if (form.age !== '') formData.append('age', String(form.age))
  if (form.price !== '') formData.append('price', String(form.price))
  if (form.origin) formData.append('origin', form.origin)
  if (form.identification_number) formData.append('identification_number', form.identification_number)
  if (form.onssa_authorization_number) formData.append('onssa_authorization_number', form.onssa_authorization_number)
  if (form.photo_asset_id) formData.append('photo_asset_id', form.photo_asset_id)

  ;(form.gallery_asset_ids ?? []).forEach((assetId) => {
    formData.append('gallery_asset_ids[]', assetId)
  })

  if (photoFile) formData.append('photo', photoFile)
  galleryFiles.forEach((file) => formData.append('gallery_files[]', file))

  return formData
}

export function buildProductFormData(form, imageFile, galleryFiles) {
  const formData = new FormData()

  formData.append('name', form.name)
  formData.append('category', form.category)
  formData.append('description', form.description)
  formData.append('price', String(form.price))
  formData.append('location', form.location)
  formData.append('contact_visibility', form.contact_visibility || 'messages_only')
  formData.append('contact_phone', form.contact_phone)
  formData.append('contact_email', form.contact_email)
  formData.append('whatsapp_enabled', form.contact_visibility === 'whatsapp' ? '1' : '0')
  formData.append('stock', String(form.stock))
  formData.append('listing_status', form.listing_status)
  formData.append('condition_status', form.condition_status)

  if (form.image_asset_id) formData.append('image_asset_id', form.image_asset_id)

  ;(form.gallery_asset_ids ?? []).forEach((assetId) => {
    formData.append('gallery_asset_ids[]', assetId)
  })

  if (imageFile) formData.append('image', imageFile)
  galleryFiles.forEach((file) => formData.append('gallery_files[]', file))

  return formData
}

export function buildAnimalContactPath(animal, t = null) {
  const message = t
    ? t('marketplace.contactAnimalMessage', { name: animal.name })
    : `Bonjour, je vous contacte a propos de votre annonce "${animal.name}". Est-elle toujours disponible ?`
  const userId = animal.author?.id ?? animal.userId ?? animal.user_id

  if (userId) {
    return `/messages?user=${encodeURIComponent(userId)}&message=${encodeURIComponent(message)}`
  }

  return `/messages?message=${encodeURIComponent(message)}`
}

export function buildPhoneContactHref(phone) {
  const safePhone = String(phone ?? '').trim()
  const digits = safePhone.replace(/\D/g, '')

  if (!digits) {
    return ''
  }

  return digits.length >= 10 ? `https://wa.me/${digits}` : `tel:${safePhone}`
}

export function hasAnimalContact(animal) {
  return Boolean(animal?.author?.id || animal?.contactPhone || animal?.contactEmail)
}

export function hasProductContact(product) {
  return Boolean(product?.author?.id || product?.contactPhone || product?.contactEmail)
}

export function buildProductContactPath(product, t = null) {
  const message = t
    ? t('marketplace.contactProductMessage', { name: product.name })
    : `Bonjour, je vous contacte a propos de votre produit "${product.name}". Est-il toujours disponible ?`
  const userId = product.author?.id ?? product.userId ?? product.user_id

  if (userId) {
    return `/messages?user=${encodeURIComponent(userId)}&message=${encodeURIComponent(message)}`
  }

  return `/messages?message=${encodeURIComponent(message)}`
}

export function formatAnimalCategory(category, t = null) {
  const labels = {
    dog: t?.('animals.labels.dog') ?? 'Chiens',
    cat: t?.('animals.labels.cat') ?? 'Chats',
    bird: t?.('animals.labels.bird') ?? 'Oiseaux',
    fish: t?.('animals.labels.fish') ?? 'Poissons',
    rabbit: t?.('animals.labels.rabbit') ?? 'Lapins',
    reptile: t?.('animals.labels.reptile') ?? 'Reptiles',
    other: t?.('animals.labels.other') ?? 'Autres',
  }

  return labels[category] ?? labels.other
}

export function formatAnimalStatus(status, t = null) {
  const labels = {
    available: t?.('animals.labels.available') ?? 'Disponible',
    reserved: t?.('animals.labels.reserved') ?? 'Reserve',
    adopted: t?.('animals.labels.adopted') ?? 'Adopte',
    sold: t?.('animals.labels.sold') ?? 'Vendu',
  }

  return labels[status] ?? labels.available
}

export function formatAnimalSellerType(sellerType, t = null) {
  const labels = {
    individual: t?.('animals.sellerTypes.individual') ?? 'Particulier',
    professional: t?.('animals.sellerTypes.professional') ?? 'Professionnel',
    association: t?.('animals.sellerTypes.association') ?? 'Association',
  }

  return labels[sellerType] ?? labels.individual
}

export function formatAnimalLegalStatus(status, t = null) {
  const labels = {
    draft: t?.('animals.legalStatuses.draft') ?? 'Brouillon',
    pending_review: t?.('animals.legalStatuses.pending_review') ?? 'En revision',
    approved: t?.('animals.legalStatuses.approved') ?? 'Approuvee',
    rejected: t?.('animals.legalStatuses.rejected') ?? 'Rejetee',
    suspended: t?.('animals.legalStatuses.suspended') ?? 'Suspendue',
  }

  return labels[status] ?? labels.pending_review
}

export function formatAnimalSex(sex, t = null) {
  const labels = {
    male: t?.('animals.labels.male') ?? 'Male',
    female: t?.('animals.labels.female') ?? 'Femelle',
    unknown: t?.('animals.labels.unknown') ?? 'Inconnu',
  }

  return labels[sex] ?? labels.unknown
}

export function formatProductCategory(category, t = null) {
  const labels = {
    food: t?.('products.labels.food') ?? 'Alimentation',
    toy: t?.('products.labels.toy') ?? 'Jouets',
    accessory: t?.('products.labels.accessory') ?? 'Accessoires',
    hygiene: t?.('products.labels.hygiene') ?? 'Hygiene',
    health: t?.('products.labels.health') ?? 'Sante',
    habitat: t?.('products.labels.habitat') ?? 'Habitat',
    other: t?.('products.labels.other') ?? 'Autres',
  }

  return labels[category] ?? labels.other
}

export function formatProductStatus(status, t = null) {
  const labels = {
    available: t?.('products.labels.available') ?? 'Disponible',
    reserved: t?.('products.labels.reserved') ?? 'Reserve',
    sold: t?.('products.labels.sold') ?? 'Vendu',
  }

  return labels[status] ?? labels.available
}

export function formatCondition(conditionStatus, t = null) {
  return conditionStatus === 'used'
    ? (t?.('products.labels.used') ?? 'Occasion')
    : (t?.('products.labels.new') ?? 'Neuf')
}
