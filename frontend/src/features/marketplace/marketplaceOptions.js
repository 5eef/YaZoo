export const animalCategoryOptions = [
  { value: '', labelKey: 'animals.labels.allCategories' },
  { value: 'dog', labelKey: 'animals.labels.dog' },
  { value: 'cat', labelKey: 'animals.labels.cat' },
  { value: 'bird', labelKey: 'animals.labels.bird' },
  { value: 'fish', labelKey: 'animals.labels.fish' },
  { value: 'rabbit', labelKey: 'animals.labels.rabbit' },
  { value: 'reptile', labelKey: 'animals.labels.reptile' },
  { value: 'other', labelKey: 'animals.labels.other' },
]

export const animalFormCategoryOptions = animalCategoryOptions.filter(
  (option) => option.value !== '',
)

export const animalStatusOptions = [
  { value: '', labelKey: 'animals.labels.allStatuses' },
  { value: 'available', labelKey: 'animals.labels.available' },
  { value: 'reserved', labelKey: 'animals.labels.reserved' },
  { value: 'adopted', labelKey: 'animals.labels.adopted' },
  { value: 'sold', labelKey: 'animals.labels.sold' },
]

export const animalFormStatusOptions = animalStatusOptions.filter(
  (option) => option.value !== '',
)

export const animalSellerTypeOptions = [
  { value: 'individual', labelKey: 'animals.sellerTypes.individual' },
  { value: 'professional', labelKey: 'animals.sellerTypes.professional' },
  { value: 'association', labelKey: 'animals.sellerTypes.association' },
]

export const animalLegalStatusOptions = [
  { value: 'pending_review', labelKey: 'animals.legalStatuses.pending_review' },
  { value: 'approved', labelKey: 'animals.legalStatuses.approved' },
  { value: 'rejected', labelKey: 'animals.legalStatuses.rejected' },
  { value: 'suspended', labelKey: 'animals.legalStatuses.suspended' },
]

export const contactVisibilityOptions = [
  { value: 'messages_only', labelKey: 'marketplaceContact.modes.messagesOnly' },
  { value: 'phone', labelKey: 'marketplaceContact.modes.phone' },
  { value: 'email', labelKey: 'marketplaceContact.modes.email' },
  { value: 'whatsapp', labelKey: 'marketplaceContact.modes.whatsapp' },
]

export const defaultAnimalForm = {
  name: '',
  category: 'other',
  type: '',
  breed: '',
  age: '',
  sex: 'unknown',
  location: '',
  contact_visibility: 'messages_only',
  contact_phone: '',
  contact_email: '',
  price: '',
  is_for_adoption: false,
  accepts_animal_rules: false,
  listing_status: 'available',
  description: '',
  seller_type: 'individual',
  origin: '',
  identification_number: '',
  onssa_authorization_number: '',
  photo_asset_id: '',
  existing_photo_url: '',
  gallery_asset_ids: [],
  existing_gallery_urls: [],
}

export const defaultAnimalFilters = {
  q: '',
  category: '',
  type: '',
  sex: '',
  location: '',
  listing_status: '',
  adoption: '',
  min_price: '',
  max_price: '',
}

export const productCategoryOptions = [
  { value: '', labelKey: 'products.labels.allCategories' },
  { value: 'food', labelKey: 'products.labels.food' },
  { value: 'toy', labelKey: 'products.labels.toy' },
  { value: 'accessory', labelKey: 'products.labels.accessory' },
  { value: 'hygiene', labelKey: 'products.labels.hygiene' },
  { value: 'health', labelKey: 'products.labels.health' },
  { value: 'habitat', labelKey: 'products.labels.habitat' },
  { value: 'other', labelKey: 'products.labels.other' },
]

export const productFormCategoryOptions = productCategoryOptions.filter(
  (option) => option.value !== '',
)

export const productStatusOptions = [
  { value: '', labelKey: 'products.labels.allStatuses' },
  { value: 'available', labelKey: 'products.labels.available' },
  { value: 'reserved', labelKey: 'products.labels.reserved' },
  { value: 'sold', labelKey: 'products.labels.sold' },
]

export const productFormStatusOptions = productStatusOptions.filter(
  (option) => option.value !== '',
)

export const defaultProductForm = {
  name: '',
  category: 'other',
  description: '',
  price: '',
  location: '',
  contact_visibility: 'messages_only',
  contact_phone: '',
  contact_email: '',
  stock: 1,
  listing_status: 'available',
  condition_status: 'new',
  image_asset_id: '',
  existing_image_url: '',
  gallery_asset_ids: [],
  existing_gallery_urls: [],
}

export const defaultProductFilters = {
  q: '',
  category: '',
  min_price: '',
  max_price: '',
  location: '',
  listing_status: '',
  condition_status: '',
}
