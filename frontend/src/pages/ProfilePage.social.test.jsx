import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, it, vi } from 'vitest'
import { I18nProvider } from '../contexts/I18nContext'
import { getPostsRequest } from '../api/posts'
import ProfilePage from './ProfilePage'

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 97, name: 'Media Owner' }, setUser: vi.fn() }) }))
vi.mock('../api/profile', () => ({ getProfileRequest: vi.fn().mockResolvedValue({ data: { data: { id: 97, name: 'Media Owner', bio: 'Owned profile' } } }), getProfileFollowersRequest: vi.fn(), getProfileFollowingRequest: vi.fn(), updateProfileRequest: vi.fn() }))
vi.mock('../api/posts', () => ({ getPostsRequest: vi.fn().mockResolvedValue({ data: { data: [] } }), createCommentRequest: vi.fn(), deletePostRequest: vi.fn(), reactToCommentRequest: vi.fn(), toggleLikeRequest: vi.fn(), updatePostRequest: vi.fn() }))
it('requests the displayed author from Laravel instead of filtering the first global feed page', async () => {
  render(<MemoryRouter initialEntries={['/profile']}><I18nProvider><ProfilePage /></I18nProvider></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Media Owner', exact: true })
  expect(getPostsRequest).toHaveBeenCalledWith({ author_id: 97 })
})
