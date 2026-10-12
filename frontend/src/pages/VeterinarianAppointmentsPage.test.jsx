import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as appointmentsApi from '../api/veterinarianAppointments'
import { I18nProvider } from '../contexts/I18nContext'
import VeterinarianAppointmentsPage from './VeterinarianAppointmentsPage'

vi.mock('../api/veterinarianAppointments', () => ({
  createVeterinarianAppointmentRequest: vi.fn(),
  createVeterinarianAvailabilityRequest: vi.fn(),
  listVeterinarianAppointmentsRequest: vi.fn(),
  listVeterinarianAvailabilityRequest: vi.fn(),
  reviewVeterinarianAppointmentRequest: vi.fn(),
  updateVeterinarianAppointmentStatusRequest: vi.fn(),
}))

describe('VeterinarianAppointmentsPage', () => {
  beforeEach(() => {
    localStorage.setItem('yazoo-locale', 'fr')
    appointmentsApi.listVeterinarianAppointmentsRequest.mockResolvedValue({
      data: {
        data: [{
          id: 17,
          veterinarianName: 'Clinique Atlas',
          startsAt: '2026-08-03T10:00:00.000Z',
          animalType: 'Chat',
          reason: 'Controle',
          status: 'completed',
          canManage: false,
          canCancel: false,
          canReview: true,
        }],
      },
    })
    appointmentsApi.reviewVeterinarianAppointmentRequest.mockResolvedValue({ data: {} })
  })

  it('permet de choisir une note de 1 a 5 avant de publier l avis', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/veterinarian-appointments']}>
        <I18nProvider>
          <VeterinarianAppointmentsPage />
        </I18nProvider>
      </MemoryRouter>,
    )

    const rating = await screen.findByRole('combobox', { name: 'Note' })
    expect(rating).toHaveValue('5')
    expect(screen.getAllByRole('option')).toHaveLength(5)

    await user.selectOptions(rating, '2')
    await user.click(screen.getByRole('button', { name: 'Publier la note' }))

    await waitFor(() => {
      expect(appointmentsApi.reviewVeterinarianAppointmentRequest).toHaveBeenCalledWith(17, { rating: 2 })
    })
  })

  it('verrouille une mutation en cours et conserve la note après une erreur 422', async () => {
    const user = userEvent.setup()
    let rejectRequest
    appointmentsApi.reviewVeterinarianAppointmentRequest.mockReturnValueOnce(new Promise((resolve, reject) => { rejectRequest = reject }))
    render(<MemoryRouter><I18nProvider><VeterinarianAppointmentsPage /></I18nProvider></MemoryRouter>)
    const rating = await screen.findByRole('combobox', { name: 'Note' })
    await user.selectOptions(rating, '3')
    const submit = screen.getByRole('button', { name: 'Publier la note' })
    await user.dblClick(submit)
    expect(appointmentsApi.reviewVeterinarianAppointmentRequest).toHaveBeenCalledTimes(1)
    expect(submit).toBeDisabled()
    rejectRequest({ response: { status: 422, data: { errors: { rating: ['Note refusée par le serveur.'] } } } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Note refusée par le serveur.')
    await waitFor(() => expect(submit).not.toBeDisabled())
    expect(rating).toHaveValue('3')
  })
})
