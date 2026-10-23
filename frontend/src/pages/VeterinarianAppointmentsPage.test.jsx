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
    vi.clearAllMocks()
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

  it('expose le refus existant au vétérinaire et recharge le statut persistant', async () => {
    const pending = { id: 21, veterinarianName: 'Clinique isolée', animalType: 'Chat', reason: 'Demande isolée', status: 'pending', canManage: true, canCancel: true }
    appointmentsApi.listVeterinarianAppointmentsRequest.mockResolvedValueOnce({ data: { data: [pending] } }).mockResolvedValue({ data: { data: [{ ...pending, status: 'rejected', canCancel: false }] } })
    appointmentsApi.updateVeterinarianAppointmentStatusRequest.mockResolvedValue({ data: {} })
    render(<MemoryRouter><I18nProvider><VeterinarianAppointmentsPage /></I18nProvider></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: 'Refuser', exact: true }))
    await screen.findByText('Refusé', { exact: true })
    expect(appointmentsApi.updateVeterinarianAppointmentStatusRequest).toHaveBeenCalledExactlyOnceWith(21, { status: 'rejected' })
    expect(screen.queryByRole('button', { name: 'Refuser', exact: true })).not.toBeInTheDocument()
  })

  it('ne propose pas le refus au client', async () => {
    appointmentsApi.listVeterinarianAppointmentsRequest.mockResolvedValue({ data: { data: [{ id: 22, reason: 'Demande client', status: 'pending', canManage: false, canCancel: true }] } })
    render(<MemoryRouter><I18nProvider><VeterinarianAppointmentsPage /></I18nProvider></MemoryRouter>)
    await screen.findByText('Demande client')
    expect(screen.queryByRole('button', { name: 'Refuser', exact: true })).not.toBeInTheDocument()
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
