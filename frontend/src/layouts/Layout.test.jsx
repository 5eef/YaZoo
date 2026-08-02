import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Layout from './Layout'
import { I18nProvider } from '../contexts/I18nContext'
import {
  createMessageRequest,
  getConversationRequest,
  getConversationsRequest,
  getUnreadMessagesCountRequest,
} from '../api/messages'
import { getNotificationsRequest, markNotificationReadRequest } from '../api/notifications'
import { OPEN_MESSAGE_DOCK_EVENT } from '../lib/messageDock'

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isBootstrapping: false,
    logout: vi.fn(),
    user: { id: 1, name: 'Admin YaZoo', isAdmin: true },
  }),
}))

vi.mock('../hooks/useNotifications', () => ({
  useNotifications: () => ({
    latestNotification: { id: 99, type: 'new_message' },
    refreshUnreadCount: vi.fn(),
    unreadCount: 1,
  }),
}))

vi.mock('../api/messages', () => ({
  createMessageRequest: vi.fn(),
  getConversationRequest: vi.fn(),
  getConversationsRequest: vi.fn(),
  getUnreadMessagesCountRequest: vi.fn(),
}))

vi.mock('../api/notifications', () => ({
  getNotificationsRequest: vi.fn(),
  markAllNotificationsReadRequest: vi.fn(),
  markNotificationReadRequest: vi.fn(),
}))

vi.mock('../api/search', () => ({
  searchUsersRequest: vi.fn().mockResolvedValue({ data: { data: [] } }),
}))

function renderLayout({ initialEntry = '/feed', locale = 'fr' } = {}) {
  localStorage.setItem('yazoo-locale', locale)

  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <I18nProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/feed" element={<p>Feed content</p>} />
            <Route path="/messages" element={<p>Messages content</p>} />
            <Route path="/notifications" element={<p>Notifications content</p>} />
          </Route>
        </Routes>
      </I18nProvider>
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUnreadMessagesCountRequest.mockResolvedValue({ data: { data: { unreadCount: 2 } } })
    getConversationsRequest.mockResolvedValue({ data: { data: [] } })
    getConversationRequest.mockResolvedValue({
      data: {
        data: {
          id: 12,
          participant: { id: 2, name: 'Amine EL IDRISSI', avatar: null },
          messages: [
            {
              id: 31,
              body: 'Bonjour depuis YaZoo',
              isOwn: false,
              createdAt: '2026-08-01T18:00:00.000Z',
            },
          ],
        },
      },
    })
    createMessageRequest.mockResolvedValue({
      data: {
        data: {
          id: 32,
          body: 'Bonjour Amine',
          isOwn: true,
          createdAt: '2026-08-01T18:01:00.000Z',
        },
        conversation: {
          id: 12,
          participant: { id: 2, name: 'Amine EL IDRISSI', avatar: null },
        },
      },
    })
    getNotificationsRequest.mockResolvedValue({
      data: {
        data: [
          {
            id: 7,
            type: 'report_status',
            title: 'Signalement',
            body: 'Statut mis a jour',
            actionUrl: '/notifications',
            isRead: false,
            createdAt: '2026-07-01T10:00:00.000Z',
            meta: {},
          },
        ],
      },
    })
    markNotificationReadRequest.mockResolvedValue({ data: {} })
  })

  it('rend la sidebar avec la route active et conserve les liens existants', () => {
    renderLayout()

    const sidebar = screen.getByTestId('desktop-sidebar')
    const sidebarQueries = within(sidebar)
    const headerQueries = within(screen.getByTestId('app-header'))

    expect(sidebar).toHaveClass('hidden', 'xl:flex')
    expect(headerQueries.getByRole('link', { name: 'Feed' })).toBeInTheDocument()
    expect(headerQueries.queryByRole('button', { name: 'Messages' })).not.toBeInTheDocument()
    expect(sidebarQueries.getByRole('link', { name: 'Feed' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(sidebarQueries.getByRole('link', { name: 'Marché YaZoo' })).toHaveAttribute(
      'href',
      '/marketplace',
    )
    expect(sidebarQueries.getByRole('link', { name: 'Communautés' })).toHaveAttribute(
      'href',
      '/communities',
    )
    expect(sidebarQueries.getByRole('link', { name: 'Historique' })).toHaveAttribute(
      'href',
      '/orders/history',
    )
  })

  it('ne laisse aucun drawer mobile interactif dans le DOM lorsqu il est ferme', async () => {
    const user = userEvent.setup()
    const { container } = renderLayout()
    const trigger = container.querySelector('[aria-controls="yazoo-mobile-navigation"]')

    expect(trigger).not.toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Menu principal' })).not.toBeInTheDocument()

    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Menu principal' })
    expect(dialog).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Fermer le menu' }))
    expect(screen.queryByRole('dialog', { name: 'Menu principal' })).not.toBeInTheDocument()
  })

  it('affiche les libelles arabes et le RTL dans la sidebar', () => {
    renderLayout({ locale: 'ar' })

    const sidebar = screen.getByTestId('desktop-sidebar')

    expect(sidebar).toHaveAttribute('dir', 'rtl')
    expect(within(sidebar).getByRole('link', { name: 'المجتمعات' })).toBeInTheDocument()
  })

  it('ouvre et ferme le dock de messages avec les donnees existantes', async () => {
    const user = userEvent.setup()

    renderLayout()

    await waitFor(() => {
      expect(getUnreadMessagesCountRequest).toHaveBeenCalled()
    })

    const dock = screen.getByTestId('desktop-messages-dock')
    await user.click(within(dock).getByRole('button', { name: 'Messages' }))

    await waitFor(() => {
      expect(getConversationsRequest).toHaveBeenCalled()
    })

    const dialog = within(dock).getByRole('dialog', { name: 'Messages' })
    expect(dialog).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Fermer le menu' }))
    expect(within(dock).queryByRole('dialog', { name: 'Messages' })).not.toBeInTheDocument()
  })

  it('ouvre une conversation dans le dock et envoie le message sans changer de page', async () => {
    const user = userEvent.setup()

    renderLayout()

    globalThis.dispatchEvent(new CustomEvent(OPEN_MESSAGE_DOCK_EVENT, {
      detail: {
        conversation: {
          id: 12,
          participant: { id: 2, name: 'Amine EL IDRISSI', avatar: null },
          messages: [],
        },
      },
    }))

    const dock = screen.getByTestId('desktop-messages-dock')

    await waitFor(() => {
      expect(getConversationRequest).toHaveBeenCalledWith(12)
    })

    expect(await within(dock).findByText('Bonjour depuis YaZoo')).toBeInTheDocument()
    await user.type(within(dock).getByPlaceholderText('Ecrivez votre message...'), 'Bonjour Amine')
    await user.click(within(dock).getByRole('button', { name: 'Envoyer' }))

    expect(createMessageRequest).toHaveBeenCalledWith(12, { body: 'Bonjour Amine' })
    expect(await within(dock).findByText('Bonjour Amine')).toBeInTheDocument()
    expect(screen.getByText('Feed content')).toBeInTheDocument()
  })

  it('aligne les actions flottantes desktop et utilise le fallback professionnel', () => {
    renderLayout()

    const actions = screen.getByTestId('desktop-floating-actions')

    expect(actions).toHaveClass('fixed', 'gap-3', 'xl:flex')
    expect(within(actions).getByTestId('desktop-messages-dock')).toBeInTheDocument()
    expect(within(actions).getByTestId('desktop-marketplace-publish')).toHaveAttribute(
      'href',
      '/settings/professional-verification',
    )
  })

  it('masque le dock sur la page messages', () => {
    renderLayout({ initialEntry: '/messages' })

    expect(screen.queryByTestId('desktop-messages-dock')).not.toBeInTheDocument()
    expect(screen.queryByTestId('desktop-floating-actions')).not.toBeInTheDocument()
  })

  it('marque une notification comme lue depuis le menu', async () => {
    const user = userEvent.setup()

    renderLayout()

    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    await user.click(await screen.findByRole('link', { name: /Signalement/i }))

    expect(markNotificationReadRequest).toHaveBeenCalledWith(7)
  })
})
