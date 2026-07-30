import type { ApiUser } from './user'

export type LoginPayload = {
  email: string
  password: string
  device_name?: string
}

export type RegisterPayload = {
  name: string
  email?: string
  phone?: string
  password: string
  password_confirmation: string
  preferred_locale?: 'fr' | 'en' | 'ar'
  device_name?: string
}

export type AuthResponse = {
  message: string
  user: ApiUser
}
