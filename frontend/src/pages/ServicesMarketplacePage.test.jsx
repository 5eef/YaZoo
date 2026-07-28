import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ServicesMarketplacePage from './ServicesMarketplacePage'
import { I18nProvider } from '../contexts/I18nContext'
import { createServiceRequest, getServicesRequest } from '../api/services'

vi.mock('../api/services', () => ({
  createServiceRequest: vi.fn(),
  getServicesRequest: vi.fn(),
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
})

function LocationProbe() {
  const location = useLocation()

  return <output data-testid="location-search">{location.search}</output>
}
