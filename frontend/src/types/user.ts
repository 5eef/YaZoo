export type ApiUser = {
  id: number
  name: string
  email: string | null
  phone?: string | null
  country?: string | null
  city?: string | null
  bio?: string | null
  avatar?: string | null
  coverPhoto?: string | null
  isAdmin?: boolean
  isPhoneVerified?: boolean
  preferredLocale?: 'fr' | 'en' | 'ar'
  createdAt?: string
  updatedAt?: string
}

export type PaginatedResponse<T> = {
  data: T[]
  links?: Record<string, string | null>
  meta?: Record<string, unknown>
}
