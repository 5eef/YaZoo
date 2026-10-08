const environment = import.meta.env ?? globalThis.process?.env ?? {}
const flag = (value, fallback) => value === undefined ? fallback : ['true', '1'].includes(value)

export const features = Object.freeze({
  startupPilot: flag(environment.VITE_STARTUP_PILOT, true),
  animalListingsPublic: flag(environment.VITE_ANIMAL_LISTINGS_PUBLIC, !flag(environment.VITE_STARTUP_PILOT, true)),
  productMarketplace: flag(environment.VITE_PRODUCT_MARKETPLACE, true),
  communities: flag(environment.VITE_COMMUNITIES, true),
  socialFeed: flag(environment.VITE_SOCIAL_FEED, true),
  payments: flag(environment.VITE_PAYMENTS, false),
})
