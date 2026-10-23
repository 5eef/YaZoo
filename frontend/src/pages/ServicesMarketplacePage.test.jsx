import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ServicesMarketplacePage from './ServicesMarketplacePage'
import { I18nProvider } from '../contexts/I18nContext'
import { createServiceRequest, getServicesRequest, updateServiceRequest, deleteServiceRequest } from '../api/services'

vi.mock('../api/services', () => ({
  createServiceRequest: vi.fn(),
  getServicesRequest: vi.fn(),
  updateServiceRequest: vi.fn(),
  deleteServiceRequest: vi.fn(),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isBootstrapping: false,
  }),
}))

describe('ServicesMarketplacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('yazoo-locale', 'fr')
    getServicesRequest.mockResolvedValue({ data: { data: [] } })
  })

  it('ouvre le formulaire et selectionne uniquement training depuis le raccourci', async () => {
    render(
      <MemoryRouter
        initialEntries={['/marketplace/services?create=1&type=training&q=chien']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <I18nProvider>
          <ServicesMarketplacePage />
          <LocationProbe />
        </I18nProvider>
      </MemoryRouter>,
    )

    const titleField = await screen.findByLabelText(/titre/i)
    const categoryField = screen.getByLabelText(/catégorie|categorie/i)

    await waitFor(() => {
      expect(titleField).toHaveFocus()
      expect(categoryField).toHaveValue('training')
      expect(screen.getByTestId('location-search')).toHaveTextContent('?q=chien')
    })
    expect(getServicesRequest).toHaveBeenCalledWith({})
    expect(createServiceRequest).not.toHaveBeenCalled()
  })

  it('edite le service owner via PATCH puis supprime seulement son ID après confirmation', async () => {
    const user = userEvent.setup()
    const service = { id: 17, isOwner: true, type: 'training', title: 'QA original', description: 'QA description', priceType: 'negotiable', provider: { name: 'QA owner' } }
    getServicesRequest.mockResolvedValue({ data: { data: [service] } })
    updateServiceRequest.mockResolvedValue({ data: {} })
    deleteServiceRequest.mockResolvedValue({ data: {} })
    render(<MemoryRouter><I18nProvider><ServicesMarketplacePage /></I18nProvider></MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: 'Modifier' }))
    const title = await screen.findByLabelText(/titre/i)
    expect(title).toHaveValue('QA original')
    await user.clear(title)
    await user.type(title, 'QA updated')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(updateServiceRequest).toHaveBeenCalledWith(17, expect.objectContaining({ title: 'QA updated', type: 'training', price_type: 'negotiable' })))
    expect(createServiceRequest).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(deleteServiceRequest).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Confirmer' }))
    await waitFor(() => expect(deleteServiceRequest).toHaveBeenCalledWith(17))
    await waitFor(() => expect(screen.queryByText('QA original')).not.toBeInTheDocument())
  })
})

function LocationProbe() {
  const location = useLocation()

  return <output data-testid="location-search">{location.search}</output>
}
