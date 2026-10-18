import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../contexts/I18nContext'
import * as api from '../../api/demoIntegration'
import ReservationFollowUp from './ReservationFollowUp'
import AdditionalModeration from '../admin/AdditionalModeration'
import CreateUserForm from '../admin/CreateUserForm'

vi.mock('../../api/demoIntegration', () => ({ listReservationPayments: vi.fn(), getPayment: vi.fn(), confirmManualPayment: vi.fn(), createReservationReview: vi.fn(), listAdminReviews: vi.fn(), moderateReview: vi.fn(), listDeletionRequests: vi.fn(), reviewDeletionRequest: vi.fn(), createAdminUser: vi.fn() }))
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 99, isAdmin: true } }) }))
const mount = child => render(<I18nProvider>{child}</I18nProvider>)
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); localStorage.setItem('yazoo-locale', 'fr'); vi.spyOn(globalThis, 'confirm').mockReturnValue(true) })
describe('existing Laravel workflows exposed in demo pages', () => {
  it('keeps an unsuccessful reservation review editable and only confirms server success', async () => {
    const user = userEvent.setup()
    mount(<ReservationFollowUp reservation={{ id: 4, reviews: { hasPendingReview: true } }} />)
    api.createReservationReview.mockRejectedValueOnce({ response: { data: { message: 'Reservation not completed' } } })
    await user.type(screen.getByRole('textbox'), 'Isolated review comment')
    await user.click(screen.getByRole('button', { name: 'Publier mon avis' }))
    expect(await screen.findByText('Reservation not completed')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('Isolated review comment')
    api.createReservationReview.mockResolvedValueOnce({})
    await user.click(screen.getByRole('button', { name: 'Publier mon avis' }))
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())
    expect(api.createReservationReview).toHaveBeenLastCalledWith(4, { rating: 5, comment: 'Isolated review comment' })
  })
  it('requires an explicit note and confirmation before manual bank receipt', async () => {
    const user = userEvent.setup()
    api.listReservationPayments.mockResolvedValue({ data: { data: [{ id: 8, provider: 'manual_bank_transfer', status: 'pending', amount: 50, currency: 'MAD' }] } })
    api.confirmManualPayment.mockResolvedValue({})
    const updated = vi.fn()
    mount(<ReservationFollowUp reservation={{ id: 4, reservationStatus: 'approved' }} onUpdated={updated} />)
    await user.click(screen.getByRole('button', { name: 'Consulter les paiements' }))
    const confirm = await screen.findByRole('button', { name: 'Confirmer la réception manuelle' })
    expect(confirm).toBeDisabled()
    await user.type(screen.getByRole('textbox'), 'Isolated receipt verification')
    await user.click(confirm)
    await waitFor(() => expect(api.confirmManualPayment).toHaveBeenCalledWith(8, { note: 'Isolated receipt verification' }))
    expect(updated).toHaveBeenCalledTimes(1)
  })
  it('loads paginated reviews and submits moderation status to Laravel', async () => {
    const user = userEvent.setup()
    api.listAdminReviews.mockResolvedValue({ data: { data: [{ id: 3, status: 'reported', comment: 'Review to moderate' }], meta: { last_page: 2 } } })
    api.moderateReview.mockResolvedValue({})
    mount(<AdditionalModeration />)
    await user.click(screen.getByRole('button', { name: 'Modérer les avis' }))
    await screen.findByText('Review to moderate')
    await user.selectOptions(screen.getByRole('combobox'), 'hidden')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(api.moderateReview).toHaveBeenCalledWith(3, { status: 'hidden', moderation_reason: '' }))
    await user.click(screen.getByRole('button', { name: 'Suivant' }))
    await waitFor(() => expect(api.listAdminReviews).toHaveBeenLastCalledWith(2))
  })
  it('allows reviewing deletion requests without exposing effective account deletion', async () => {
    const user = userEvent.setup()
    api.listDeletionRequests.mockResolvedValue({ data: { data: [{ id: 6, status: 'pending', reason: 'Test request' }] } })
    api.reviewDeletionRequest.mockResolvedValue({})
    mount(<AdditionalModeration />)
    await user.click(screen.getByRole('button', { name: 'Demandes de suppression' }))
    await screen.findByText('Test request')
    expect(screen.queryByRole('option', { name: 'completed' })).not.toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox'), 'reviewed')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(api.reviewDeletionRequest).toHaveBeenCalledWith(6, { status: 'reviewed', admin_note: '' }))
  })
  it('creates a new account with provided test credentials and clears the form', async () => {
    api.createAdminUser.mockResolvedValue({})
    const { container } = mount(<CreateUserForm />)
    const fields = { name: 'Isolated account', email: 'new@example.test', password: 'Isolated-Test-Only!', password_confirmation: 'Isolated-Test-Only!' }
    for (const [name,value] of Object.entries(fields)) fireEvent.change(container.querySelector(`[name="${name}"]`), { target: { value } })
    fireEvent.submit(container.querySelector('form'))
    await waitFor(() => expect(api.createAdminUser).toHaveBeenCalledWith(fields))
    await waitFor(() => expect(container.querySelector('[name="password"]')).toHaveValue(''))
  })
})
