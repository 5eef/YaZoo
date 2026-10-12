import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import VeterinariansMarketplacePage from './VeterinariansMarketplacePage'
import { I18nProvider } from '../contexts/I18nContext'
import {
  createVeterinarianRequest,
  listVeterinariansRequest,
  updateVeterinarianRequest,
} from '../api/veterinarians'

vi.mock('../api/veterinarians', () => ({
  createVeterinarianRequest: vi.fn(),
  listVeterinariansRequest: vi.fn(),
  updateVeterinarianRequest: vi.fn(),
  deleteVeterinarianRequest: vi.fn(),
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

  it('prefill owner utilise les champs Resource puis PATCH sans recréer la fiche', async () => {
    const user = userEvent.setup()
    listVeterinariansRequest.mockResolvedValue({ data: { data: [{ id: 27, name: 'QA vet', clinicName: 'QA clinic', specialties: ['cats'], workingHours: ['Monday'], isOwner: true }] } })
    updateVeterinarianRequest.mockResolvedValue({ data: {} })
    render(<MemoryRouter><I18nProvider><VeterinariansMarketplacePage /></I18nProvider></MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: 'Modifier' }))
    expect(await screen.findByLabelText(/^Nom$/i)).toHaveValue('QA vet')
    expect(screen.getByRole('textbox', { name: /cabinet/i })).toHaveValue('QA clinic')
    const form = screen.getByLabelText(/^Nom$/i).closest('form')
    await user.click(form.querySelector('[type="submit"]'))
    await waitFor(() => expect(updateVeterinarianRequest).toHaveBeenCalledWith(27, expect.objectContaining({ name: 'QA vet', clinic_name: 'QA clinic', specialties: ['cats'], working_hours: ['Monday'] })))
    expect(createVeterinarianRequest).not.toHaveBeenCalled()
  })
})

function LocationProbe() {
  const location = useLocation()

  return <output data-testid="location-search">{location.search}</output>
}
