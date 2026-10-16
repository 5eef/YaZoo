const environment = import.meta.env ?? globalThis.process?.env ?? {}

export const brand = Object.freeze({
  name: environment.VITE_BRAND_NAME?.trim() || environment.VITE_APP_NAME?.trim() || 'YaZoo',
  shortName: environment.VITE_BRAND_SHORT_NAME?.trim() || 'YaZoo',
  logo: '/brand/yazoo-inapp-2026.png',
  loginLight: '/brand/login-light-2026.png',
  loginDark: '/brand/login-dark-2026.png',
  supportEmail: environment.VITE_BRAND_SUPPORT_EMAIL?.trim() || '',
})
