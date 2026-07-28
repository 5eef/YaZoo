import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import PostCard from './PostCard'
import { I18nProvider } from '../../contexts/I18nContext'

vi.mock('../ui/FollowButton', () => ({
  default: () => null,
}))

vi.mock('../reports/ReportButton', () => ({
  default: () => null,
}))

const post = {
  id: 77,
  content: 'Post a supprimer',
  createdAt: '2026-07-01T10:00:00.000Z',
  visibility: 'public',
  author: {
    id: 10,
    name: 'Admin YaZoo',
    avatar: '',
  },
  comments: [],
  reactions: [],
}

function renderPostCard(ui) {
  localStorage.setItem('yazoo-locale', 'fr')

  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <I18nProvider>{ui}</I18nProvider>
    </MemoryRouter>,
  )
}

describe('PostCard', () => {
  it('affiche le libelle de confirmation de suppression pendant le traitement', async () => {
    const user = userEvent.setup()

    renderPostCard(
      <PostCard
        post={post}
        currentUserId={10}
        onCreateComment={vi.fn()}
        onDeletePost={vi.fn()}
        onReactToComment={vi.fn()}
        onToggleLike={vi.fn()}
        onUpdatePost={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Options du post' }))
    await user.click(screen.getByRole('button', { name: 'Supprimer' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument()
  })
})
