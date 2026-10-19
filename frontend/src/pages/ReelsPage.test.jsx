import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { I18nProvider } from '../contexts/I18nContext'
import { getPostsRequest, toggleLikeRequest } from '../api/posts'
import ReelsPage from './ReelsPage'

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 1 } }) }))
vi.mock('../api/posts', () => ({ getPostsRequest: vi.fn(), toggleLikeRequest: vi.fn(), createCommentRequest: vi.fn(), reactToCommentRequest: vi.fn(), updatePostRequest: vi.fn(), deletePostRequest: vi.fn() }))
// Keep the page tests focused on orchestration; PostCard has its own interaction suite.
vi.mock('../components/feed/PostCard', () => ({ default: ({ post, onToggleLike, isLikePending }) => <article><video src={post.mediaUrl} /><p>{post.content}</p><button disabled={isLikePending} onClick={() => onToggleLike(post.id, 'love')}>React</button><span>{post.likes}</span></article> }))
const video = { id: 8, mediaKind: 'video', mediaUrl: '/api/media/synthetic-video', content: 'Visible video', likes: 0 }
const response = (data, last = 1) => ({ data: { data, meta: { last_page: last } } })
const mount = () => render(<MemoryRouter><I18nProvider><ReelsPage /></I18nProvider></MemoryRouter>)
beforeEach(() => { vi.resetAllMocks(); localStorage.setItem('yazoo-locale', 'fr'); vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {}) })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('requests only paginated Laravel videos and clears the previous page', async () => {
  getPostsRequest.mockResolvedValueOnce(response([video, { id: 9, mediaKind: 'image', mediaUrl: '/image.png', content: 'Image' }], 2)).mockResolvedValueOnce(response([{ ...video, id: 10, content: 'Next video' }], 2))
  mount()
  await screen.findByText('Visible video')
  expect(screen.queryByText('Image')).not.toBeInTheDocument()
  expect(getPostsRequest).toHaveBeenCalledWith({ media_kind: 'video', page: 1 })
  await userEvent.click(screen.getByRole('button', { name: 'Suivant' }))
  await screen.findByText('Next video')
  expect(screen.queryByText('Visible video')).not.toBeInTheDocument()
  expect(getPostsRequest).toHaveBeenLastCalledWith({ media_kind: 'video', page: 2 })
})

it('persists the selected reaction and never retries an uncertain POST', async () => {
  getPostsRequest.mockResolvedValue(response([video]))
  toggleLikeRequest.mockResolvedValueOnce({ data: { data: { ...video, likes: 1 } } }).mockRejectedValueOnce(new Error('Network interrupted'))
  mount()
  await screen.findByText('Visible video')
  await userEvent.click(screen.getByRole('button', { name: 'React' }))
  await screen.findByText('1')
  expect(toggleLikeRequest).toHaveBeenCalledWith(8, 'love')
  await userEvent.click(screen.getByRole('button', { name: 'React' }))
  await screen.findByRole('alert')
  expect(toggleLikeRequest).toHaveBeenCalledTimes(2)
})

it('ignores an obsolete response after leaving the page', async () => {
  let resolve
  getPostsRequest.mockReturnValue(new Promise((done) => { resolve = done }))
  const first = mount()
  first.unmount()
  getPostsRequest.mockResolvedValue(response([]))
  mount()
  resolve(response([video]))
  await screen.findByText('Aucune vidéo disponible.')
  expect(screen.queryByText('Visible video')).not.toBeInTheDocument()
})

it('pauses video on hiding the document and on unmount', async () => {
  getPostsRequest.mockResolvedValue(response([video]))
  const view = mount()
  await screen.findByText('Visible video')
  Object.defineProperty(document, 'hidden', { configurable: true, value: true })
  document.dispatchEvent(new Event('visibilitychange'))
  await waitFor(() => expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled())
  view.unmount()
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})
