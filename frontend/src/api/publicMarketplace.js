import api from './client'

export const getPublicMarketplacePreviewRequest = (perSection = 6) =>
  api.get('/marketplace/public-preview', {
    params: {
      per_section: perSection,
    },
    skipAuthSessionExpired: true,
    skipGlobalErrorToast: true,
  })

export const getPublicMarketplaceSectionRequest = (
  section,
  page = 1,
  perPage = 12,
) =>
  api.get(`/marketplace/public/${section}`, {
    params: {
      page,
      per_page: perPage,
    },
    skipAuthSessionExpired: true,
    skipGlobalErrorToast: true,
  })

export const getPublicMarketplaceListingRequest = (section, listingId) =>
  api.get(`/marketplace/public/${section}/${listingId}`, {
    skipAuthSessionExpired: true,
    skipGlobalErrorToast: true,
  })
