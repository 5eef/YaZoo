import type { ApiUser, PaginatedResponse } from '../../types/user'
import { apiClient } from './client'

export type CreateUserPayload = {
  name: string
  email: string
  phone?: string | null
  country?: string | null
  city?: string | null
  preferred_locale?: 'fr' | 'en' | 'ar'
  is_admin?: boolean
  password: string
  password_confirmation: string
}

export async function listUsers(page = 1): Promise<PaginatedResponse<ApiUser>> {
  const response = await apiClient.get<PaginatedResponse<ApiUser>>('/admin/users', {
    params: { page },
  })

  return response.data
}

export async function createUser(payload: CreateUserPayload): Promise<ApiUser> {
  const response = await apiClient.post<{ data: ApiUser }>('/admin/users', payload)

  return response.data.data
}
