import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import VeterinariansMarketplacePage from './VeterinariansMarketplacePage'
import { I18nProvider } from '../contexts/I18nContext'
import {
  createVeterinarianRequest,
  listVeterinariansRequest,
} from '../api/veterinarians'

vi.mock('../api/veterinarians', () => ({
  createVeterinarianRequest: vi.fn(),
  listVeterinariansRequest: vi.fn(),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}))

describe('VeterinariansMarketplacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('yazoo-locale', 'fr')
    listVeterinariansRequest.mockResolvedValue({ data: { data: [] } })
  })

  it('ouvre et focalise la creation depuis create=1 sans requete de creation', async () => {
    render(
      <MemoryRouter
        initialEntries={['/marketplace/veterinarians?create=1&city=Rabat']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <I18nProvider>
          <VeterinariansMarketplacePage />
          <LocationProbe />
        </I18nProvider>
      </MemoryRouter>,
    )

    const nameField = await screen.findByLabelText(/^Nom$/i)

    await waitFor(() => {
      expect(nameField).toHaveFocus()
      expect(screen.getByTestId('location-search')).toHaveTextContent('?city=Rabat')
    })
    expect(createVeterinarianRequest).not.toHaveBeenCalled()
  })
})

function LocationProbe() {
  const location = useLocation()

  return <output data-testid="location-search">{location.search}</output>
}
