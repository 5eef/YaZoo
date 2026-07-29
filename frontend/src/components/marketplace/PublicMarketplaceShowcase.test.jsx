import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getPublicMarketplacePreviewRequest } from '../../api/publicMarketplace'
import { I18nProvider } from '../../contexts/I18nContext'
import { messages, translate } from '../../lib/i18n'
import PublicMarketplaceShowcase from './PublicMarketplaceShowcase'

vi.mock('../../api/publicMarketplace', () => ({
  getPublicMarketplacePreviewRequest: vi.fn(),
}))

const emptyResponse = {
  data: {
    data: {
      animals: [],
      products: [],
      services: [],
      veterinarians: [],
    },
  },
}

describe('PublicMarketplaceShowcase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('yazoo-locale', 'fr')
  })

  it('affiche les annonces publiques, ouvre leur fiche et protège la publication', async () => {
    getPublicMarketplacePreviewRequest.mockResolvedValue({
      data: {
        data: {
          ...emptyResponse.data.data,
          animals: [
            {
              id: 1,
              type: 'animal',
              title: 'Luna',
              subtitle: 'Chat',
              description: 'Animal sociable',
              location: 'Sefrou',
              price: null,
              imageUrl: null,
              badge: 'adoption',
              professionalBadge: 'verified_breeder',
              createdAt: '2026-07-24T12:00:00.000Z',
              author: { name: 'Association locale', avatar: null },
            },
          ],
        },
      },
    })

    renderShowcase()

    expect(
      await screen.findByRole('heading', {
        name: 'Les dernières annonces du Marché YaZoo',
      }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Luna')).toBeInTheDocument()
    expect(screen.getByText('Adoption')).toBeInTheDocument()
    expect(screen.getByText('Eleveur verifie')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voir les détails' })).toHaveAttribute(
      'href',
      '/discover/animals/1',
    )
    expect(screen.getByRole('link', { name: 'Publier une annonce' })).toHaveAttribute(
      'href',
      '/register',
    )
  })

  it('affiche un état vide pour chacune des quatre catégories', async () => {
    getPublicMarketplacePreviewRequest.mockResolvedValue(emptyResponse)

    renderShowcase()

    expect(
      await screen.findAllByText(
        'Aucune annonce approuvée dans cette catégorie pour le moment.',
      ),
    ).toHaveLength(4)
  })

  it('affiche une erreur compréhensible et permet de relancer le chargement', async () => {
    getPublicMarketplacePreviewRequest
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(emptyResponse)

    renderShowcase()

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent(
      'Les annonces publiques sont temporairement indisponibles.',
    )
    expect(alert).toHaveClass('dark:bg-amber-950/60', 'dark:text-amber-100')

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(
      await screen.findAllByText(
        'Aucune annonce approuvée dans cette catégorie pour le moment.',
      ),
    ).toHaveLength(4)
    expect(getPublicMarketplacePreviewRequest).toHaveBeenCalledTimes(2)
  })

  it('respecte la direction RTL en arabe', async () => {
    localStorage.setItem('yazoo-locale', 'ar')
    getPublicMarketplacePreviewRequest.mockResolvedValue(emptyResponse)

    renderShowcase()

    expect(
      await screen.findByRole('heading', { name: 'أحدث إعلانات سوق YaZoo' }),
    ).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
  })

  it.each([
    ['fr', 'landing.marketplaceTitle', 'Les dernières annonces du Marché YaZoo'],
    ['ar', 'landing.marketplaceTitle', 'أحدث إعلانات سوق YaZoo'],
    ['en', 'landing.marketplaceTitle', 'Latest YaZoo Marketplace listings'],
    ['fr', 'landing.marketplaceBadges.verified_professional', 'Professionnel vérifié'],
    ['ar', 'landing.marketplaceBadges.verified_professional', 'مهني معتمد'],
    ['en', 'landing.marketplaceBadges.verified_professional', 'Verified professional'],
    ['fr', 'landing.marketplaceBadges.verified_veterinarian', 'Veterinaire verifie'],
    ['ar', 'landing.marketplaceBadges.verified_veterinarian', 'طبيب بيطري موثق'],
    ['en', 'landing.marketplaceBadges.verified_veterinarian', 'Verified veterinarian'],
    [
      'fr',
      'auth.login.googleFailed',
      'La connexion Google a échoué ou a été refusée. Vérifiez votre compte puis réessayez.',
    ],
    [
      'ar',
      'auth.register.googleFailed',
      'فشل التسجيل عبر Google أو تم رفضه. تحقق من حسابك ثم أعد المحاولة.',
    ],
    [
      'en',
      'auth.register.googleFailed',
      'Google sign-up failed or was refused. Check your account and try again.',
    ],
  ])('conserve la traduction %s de %s', (locale, key, expected) => {
    expect(translate(locale, key)).toBe(expected)
  })

  it('reconstruit des objets marketplace independants pour chaque locale', () => {
    expect(messages.fr.landing).not.toBe(messages.ar.landing)
    expect(messages.fr.landing).not.toBe(messages.en.landing)
    expect(messages.fr.landing.marketplaceBadges).not.toBe(
      messages.ar.landing.marketplaceBadges,
    )
    expect(messages.ar.landing.marketplaceBadges).not.toBe(
      messages.en.landing.marketplaceBadges,
    )
  })
})

function renderShowcase() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <PublicMarketplaceShowcase />
      </I18nProvider>
    </MemoryRouter>,
  )
}
