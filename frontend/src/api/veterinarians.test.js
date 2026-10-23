import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './client'
import { updateVeterinarianRequest } from './veterinarians'
vi.mock('./client', () => ({ default: { patch: vi.fn(), post: vi.fn() } }))
describe('veterinarian update transport', () => {
  beforeEach(() => vi.clearAllMocks())
  it('preserves JSON PATCH and uses PHP multipart method override for uploads', () => {
    const json = { name: 'QA veterinarian' }
    updateVeterinarianRequest(17, json)
    expect(api.patch).toHaveBeenCalledWith('/veterinarians/17', json)
    const form = new FormData()
    form.append('name', 'QA veterinarian')
    form.append('image', new File(['fixture'], 'qa.png', { type: 'image/png' }))
    updateVeterinarianRequest(17, form)
    expect(api.post).toHaveBeenCalledWith('/veterinarians/17', form)
    expect(form.getAll('_method')).toEqual(['PATCH'])
    expect(form.get('image')).toBeInstanceOf(File)
  })
})
