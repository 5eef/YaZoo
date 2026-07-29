export const PUBLIC_MARKETPLACE_SECTIONS = Object.freeze([
  {
    key: 'animals',
    titleKey: 'landing.marketplaceAnimals',
    pageTitleKey: 'publicMarketplace.animalsTitle',
    descriptionKey: 'publicMarketplace.animalsDescription',
  },
  {
    key: 'products',
    titleKey: 'landing.marketplaceProducts',
    pageTitleKey: 'publicMarketplace.productsTitle',
    descriptionKey: 'publicMarketplace.productsDescription',
  },
  {
    key: 'services',
    titleKey: 'landing.marketplaceServices',
    pageTitleKey: 'publicMarketplace.servicesTitle',
    descriptionKey: 'publicMarketplace.servicesDescription',
  },
  {
    key: 'veterinarians',
    titleKey: 'landing.marketplaceVeterinarians',
    pageTitleKey: 'publicMarketplace.veterinariansTitle',
    descriptionKey: 'publicMarketplace.veterinariansDescription',
  },
])

const SECTION_KEYS = new Set(
  PUBLIC_MARKETPLACE_SECTIONS.map((section) => section.key),
)

export function isPublicMarketplaceSection(value) {
  return SECTION_KEYS.has(value)
}

export function getPublicMarketplaceSection(value) {
  return PUBLIC_MARKETPLACE_SECTIONS.find((section) => section.key === value)
}

export function getPublicMarketplaceSectionPath(section) {
  return `/discover/${section}`
}

export function getPublicMarketplaceListingPath(section, listingId) {
  return `${getPublicMarketplaceSectionPath(section)}/${listingId}`
}
