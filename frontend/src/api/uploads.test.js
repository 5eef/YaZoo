import { beforeEach, expect, it, vi } from 'vitest'
import api from './client'
import { updateProfileRequest } from './profile'
import { createPostRequest } from './posts'
import { createStoryRequest } from './stories'

vi.mock('./client', () => ({ default: { post: vi.fn(), patch: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())

it('profile uses multipart method override with exact file names and boolean serialization', () => {
  const file = new File(['qa'], 'qa.png', { type: 'image/png' })
  updateProfileRequest(7, { avatar_file: file, cover_photo_file: file, remove_avatar: false })
  const [url, payload] = api.post.mock.calls[0]
  expect(url).toBe('/users/7')
  expect(payload.get('_method')).toBe('PATCH')
  expect(payload.get('avatar_file')).toBe(file)
  expect(payload.get('cover_photo_file')).toBe(file)
  expect(payload.get('remove_avatar')).toBe('0')
  expect(api.post.mock.calls[0]).toHaveLength(2)
})

it('post and story upload media_file without manually setting the multipart boundary', () => {
  const file = new File(['qa'], 'qa.mp4', { type: 'video/mp4' })
  createPostRequest({ media_file: file, content: 'QA' })
  createStoryRequest({ media_file: file, content: 'QA' })
  expect(api.post.mock.calls.map(call => call[0])).toEqual(['/posts', '/stories'])
  for (const call of api.post.mock.calls) {
    expect(call[1].get('media_file')).toBe(file)
    expect(call).toHaveLength(2)
  }
})
