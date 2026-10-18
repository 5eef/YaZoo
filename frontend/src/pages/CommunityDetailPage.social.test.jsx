import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { expect, it, vi } from 'vitest'
import { I18nProvider } from '../contexts/I18nContext'
import { joinCommunityRequest } from '../api/communities'
import CommunityDetailPage from './CommunityDetailPage'

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 97 } }) }))
vi.mock('../api/communities', () => ({
  getCommunityRequest: vi.fn().mockRejectedValue({ response: { status: 403 } }),
  joinCommunityRequest: vi.fn().mockResolvedValue({ data: { message: 'Demande envoyée', data: { name: 'Secret community metadata' } } }),
  leaveCommunityRequest: vi.fn(), deleteCommunityRequest: vi.fn(),
}))
vi.mock('../api/posts', () => ({ getPostsRequest: vi.fn().mockRejectedValue({ response: { status: 403 } }), createCommentRequest: vi.fn(), createPostRequest: vi.fn(), deletePostRequest: vi.fn(), reactToCommentRequest: vi.fn(), toggleLikeRequest: vi.fn(), updatePostRequest: vi.fn() }))
it('allows a membership request from a private link while keeping inaccessible group data hidden', async () => {
  localStorage.setItem('yazoo-locale', 'fr')
  render(<MemoryRouter initialEntries={['/communities/58']}><I18nProvider><Routes><Route path="/communities/:communityId" element={<CommunityDetailPage />} /></Routes></I18nProvider></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: /Demander/ }))
  await screen.findByText('Demande envoyée')
  expect(joinCommunityRequest).toHaveBeenCalledWith('58')
  expect(screen.queryByText('Secret community metadata')).toBeNull()
  expect(screen.queryByRole('button', { name: /Demander/ })).toBeNull()
})
