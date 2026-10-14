import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../contexts/I18nContext'
import PublicVeterinarianDetails from './PublicVeterinarianDetails'

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: false }) }))
const listing = { id: 3, ownerId: 8, isDemo: true, timezone: 'Africa/Casablanca', specialties: ['Vaccination'], workingHours: ['09:00-18:00'], availability: [
  { id: 14, startsAt: '2026-10-15T09:00:00Z', isAvailable: true },
  { id: 15, startsAt: '2026-10-15T10:00:00Z', isAvailable: false },
] }

describe('public veterinarian interactions', () => {
  it('preserves the selected slot through login and disables occupied slots', async () => {
    localStorage.setItem('yazoo-locale', 'fr')
    render(<MemoryRouter><I18nProvider><PublicVeterinarianDetails listing={listing} /></I18nProvider></MemoryRouter>)
    await userEvent.selectOptions(screen.getByRole('combobox'), '14')
    const target = new URL(screen.getByRole('link', { name: 'Prendre rendez-vous' }).href)
    expect(target.searchParams.get('returnTo')).toBe('/veterinarian-appointments?veterinarian=3&slot=14')
    expect(screen.getByRole('option', { name: /Indisponible/ })).toBeDisabled()
    expect(screen.getByText('Vaccination')).toBeVisible()
    expect(screen.getByText('09:00-18:00')).toBeVisible()
  })
  it.each(['fr', 'en', 'ar'])('renders an empty calendar and translated actions in %s', (locale) => {
    localStorage.setItem('yazoo-locale', locale)
    render(<MemoryRouter><I18nProvider><PublicVeterinarianDetails listing={{ ...listing, availability: [] }} /></I18nProvider></MemoryRouter>)
    expect(screen.getByRole('status')).toBeVisible()
    expect(screen.getAllByRole('link')).toHaveLength(4)
    expect(screen.queryByText(/publicVet\./)).not.toBeInTheDocument()
  })
})
