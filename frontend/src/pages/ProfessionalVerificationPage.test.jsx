import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProfessionalVerificationPage from './ProfessionalVerificationPage'
import { I18nProvider } from '../contexts/I18nContext'
import {
  createProfessionalVerificationRequest,
  getMyProfessionalVerificationsRequest,
} from '../api/professionalVerifications'

vi.mock('../api/professionalVerifications', () => ({
  createProfessionalVerificationRequest: vi.fn(),
  getMyProfessionalVerificationsRequest: vi.fn(),
}))

describe('ProfessionalVerificationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('yazoo-locale', 'fr')
    getMyProfessionalVerificationsRequest.mockResolvedValue({ data: { data: [] } })
  })

  it('propose les categories vendeur et dresseur sans retirer les anciennes', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <I18nProvider>
          <ProfessionalVerificationPage />
        </I18nProvider>
      </MemoryRouter>,
    )

    const businessType = await screen.findByLabelText(/type d.*activité|type d.*activite/i)

    const options = Array.from(businessType.options).map((option) => ({
      label: option.textContent,
      value: option.value,
    }))

    expect(options).toEqual(expect.arrayContaining([
      { value: 'seller', label: 'Vendeur' },
      { value: 'trainer', label: 'Dresseur' },
      { value: 'veterinarian', label: 'Veterinaire' },
    ]))
    expect(createProfessionalVerificationRequest).not.toHaveBeenCalled()
  })

  it('rend les informations de licence obligatoires pour un veterinaire', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <I18nProvider>
          <ProfessionalVerificationPage />
        </I18nProvider>
      </MemoryRouter>,
    )

    const businessType = await screen.findByLabelText(/type d.*activit/i)
    await user.selectOptions(businessType, 'veterinarian')

    expect(screen.getByLabelText(/numero licence professionnelle/i)).toBeRequired()
    expect(screen.getByLabelText(/expiration du document/i)).toBeRequired()
    expect(screen.getByLabelText(/document justificatif/i)).toBeRequired()
    expect(screen.getByLabelText(/type de document/i)).toHaveValue('veterinarian_license')
    expect(screen.getByText(/date d expiration future sont obligatoires/i)).toBeInTheDocument()
  })
})
