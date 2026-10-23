import { describe, expect, it, vi } from 'vitest'
vi.mock('../lib/appConfig', () => ({ getBackendBaseUrl: () => 'https://api.yazoo.test' }))
import { getMediaUrl, getPostMedia, safeMediaSource } from './media'

describe('protected post media URLs', () => {
  it('rejects executable previews without rewriting signed media URLs', () => {
    for (const unsafe of ['javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'data:image/svg+xml;base64,PHN2Zz4=', '/image" onerror="alert(1)']) {
      expect(safeMediaSource(unsafe)).toBe('')
    }
    for (const safe of ['/api/media/posts/12', 'blob:local-preview', 'data:image/png;base64,aGVsbG8=', 'https://media.test/object?X-Amz-Signature=a%2Fb&X-Amz-Credential=c%2Fd']) {
      expect(safeMediaSource(safe)).toBe(safe)
    }
  })
  it('keeps authenticated API media routes on the backend instead of treating them as storage paths', () => {
    expect(getMediaUrl('/api/media/posts/12')).toBe('https://api.yazoo.test/api/media/posts/12')
    expect(getPostMedia({ mediaUrl: '/api/media/posts/12', mediaKind: 'video' })).toEqual({ mediaUrl: 'https://api.yazoo.test/api/media/posts/12', mediaKind: 'video' })
    expect(getMediaUrl('/storage/avatars/a.png')).toBe('https://api.yazoo.test/storage/avatars/a.png')
  })
})
