import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import PublicListingCard from './PublicListingCard'

const listing = {
  id: 7,
  type: 'animal',
  title: 'Chat approuve',
  subtitle: 'Europeen',
  description: 'Description publique.',
  location: 'Rabat',
  price: null,
  imageUrl: null,
  badge: 'adoption',
  professionalBadge: null,
  createdAt: '2026-07-24T10:00:00Z',
  author: {
    name: 'Association YaZoo',
    avatar: null,
  },
}

const translations = {
  'common.user': 'Utilisateur',
  'landing.marketplaceBadges.adoption': 'Adoption',
  'landing.marketplaceBadges.verified_pet_shop': 'Animalerie verifiee',
  'landing.marketplaceDetails': 'Voir les details',
  'landing.marketplaceImageMissing': 'Image indisponible',
  'landing.marketplaceNoDescription': 'Sans description',
}

describe('PublicListingCard', () => {
  it('links public cards to the read-only detail route', () => {
    render(
      <MemoryRouter>
        <PublicListingCard
          listing={listing}
          locale="fr"
          section="animals"
          t={(key) => translations[key] ?? key}
        />
      </MemoryRouter>,
    )

    const detailLinks = screen.getAllByRole('link')

    expect(detailLinks).toHaveLength(2)
    detailLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/discover/animals/7')
    })
    expect(screen.getByText('Chat approuve')).toBeVisible()
    expect(screen.getByText('Adoption')).toBeVisible()
    expect(screen.queryByText(/telephone|email|whatsapp/i)).not.toBeInTheDocument()
  })

  it('keeps professional and status badges readable in dark mode', () => {
    render(
      <MemoryRouter>
        <PublicListingCard
          listing={{ ...listing, professionalBadge: 'verified_pet_shop' }}
          locale="fr"
          section="products"
          t={(key) => translations[key] ?? key}
        />
      </MemoryRouter>,
    )

    const professionalBadge = screen.getByText('Animalerie verifiee')
    const statusBadge = screen.getByText('Adoption')

    expect(professionalBadge).toHaveClass(
      'whitespace-nowrap',
      'dark:bg-emerald-950/80',
      'dark:text-emerald-100',
    )
    expect(statusBadge).toHaveClass(
      'whitespace-nowrap',
      'dark:bg-violet-950/80',
      'dark:text-violet-100',
    )
  })
})
