import { describe, expect, it, vi } from 'vitest'
vi.mock('../lib/appConfig', () => ({ getBackendBaseUrl: () => 'https://api.yazoo.test' }))
import { getMediaUrl, getPostMedia } from './media'

describe('protected post media URLs', () => {
  it('keeps authenticated API media routes on the backend instead of treating them as storage paths', () => {
    expect(getMediaUrl('/api/media/posts/12')).toBe('https://api.yazoo.test/api/media/posts/12')
    expect(getPostMedia({ mediaUrl: '/api/media/posts/12', mediaKind: 'video' })).toEqual({ mediaUrl: 'https://api.yazoo.test/api/media/posts/12', mediaKind: 'video' })
    expect(getMediaUrl('/storage/avatars/a.png')).toBe('https://api.yazoo.test/storage/avatars/a.png')
  })
})
