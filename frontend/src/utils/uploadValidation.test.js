import { describe, expect, it } from 'vitest'
import { galleryError, uploadError } from './uploadValidation'
import { messages } from '../lib/i18n'

describe('Laravel upload constraints', () => {
  it('has intact French, English and Arabic error translations', () => {
    for (const key of ['uploadType', 'uploadSize', 'uploadCount']) {
      expect(messages.fr.errors[key]).not.toContain('?')
      expect(messages.en.errors[key]).toBeTruthy()
      expect(messages.ar.errors[key]).toMatch(/[\u0600-\u06ff]/)
      expect(messages.ar.errors[key]).not.toContain('?')
    }
  })
  it('uses 5 MB image/document and 20 MB media limits', () => {
    expect(uploadError({ type: 'image/png', size: 5 * 1024 * 1024 })).toBeNull()
    expect(uploadError({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toBe('errors.uploadSize')
    expect(uploadError({ type: 'video/mp4', size: 20 * 1024 * 1024 }, 'media')).toBeNull()
    expect(uploadError({ type: 'application/pdf', size: 1 }, 'document')).toBeNull()
    expect(uploadError({ type: 'image/svg+xml', size: 1 }, 'media')).toBe('errors.uploadType')
  })
  it('rejects excess gallery images before upload', () => {
    const image = { type: 'image/png', size: 1 }
    expect(galleryError(image, Array(6).fill(image))).toBe('errors.uploadCount')
    expect(galleryError(image, Array(5).fill(image))).toBeNull()
  })
})
