import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { vi } from 'vitest'

import ProductsMarketplacePage from './ProductsMarketplacePage'
import { I18nProvider } from '../contexts/I18nContext'
import * as productService from '../services/marketplace/productsMarketplaceService'

vi.mock('../services/marketplace/productsMarketplaceService', () => ({
  createProduct: vi.fn(),
  deleteProduct: vi.fn(),
  fetchProducts: vi.fn(),
  updateProduct: vi.fn(),
}))

describe('ProductsMarketplacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('yazoo-locale', 'fr')
    productService.fetchProducts.mockResolvedValue([])
    productService.createProduct.mockResolvedValue({ data: {} })
    productService.updateProduct.mockResolvedValue({ data: {} })
    productService.deleteProduct.mockResolvedValue({ data: {} })
  })

  it('soumet le formulaire de creation produit', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <I18nProvider>
          <ProductsMarketplacePage />
        </I18nProvider>
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: /Ajouter un produit/i }))
    const heading = await screen.findByRole('heading', { name: 'Créer un produit' })
    const publicationForm = heading.closest('form')

    expect(publicationForm).not.toBeNull()

    await user.type(within(publicationForm).getByLabelText('Nom'), 'Panier velours')
    await user.clear(within(publicationForm).getByLabelText('Prix'))
    await user.type(within(publicationForm).getByLabelText('Prix'), '240')
    await user.type(within(publicationForm).getByLabelText('Localisation'), 'Marrakech')
    await user.type(within(publicationForm).getByLabelText('Description'), 'Panier confortable')
    await user.click(within(publicationForm).getByRole('button', { name: 'Publier le produit' }))

    await waitFor(() => {
      expect(productService.createProduct).toHaveBeenCalledTimes(1)
    })

    const formData = productService.createProduct.mock.calls[0][0]

    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get('name')).toBe('Panier velours')
    expect(formData.get('price')).toBe('240')
    expect(formData.get('location')).toBe('Marrakech')
    expect(formData.get('listing_status')).toBe('available')
    expect(await screen.findByText('Produit cree avec succes.')).toBeInTheDocument()
  })

  it('ouvre et focalise le formulaire depuis create=1 sans soumettre', async () => {
    render(
      <MemoryRouter
        initialEntries={['/marketplace/products?create=1&q=panier']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <I18nProvider>
          <ProductsMarketplacePage />
          <LocationProbe />
        </I18nProvider>
      </MemoryRouter>,
    )

    const nameField = await screen.findByLabelText('Nom')

    await waitFor(() => {
      expect(nameField).toHaveFocus()
      expect(screen.getByTestId('location-search')).toHaveTextContent('?q=panier')
    })
    expect(productService.createProduct).not.toHaveBeenCalled()
  })
})

function LocationProbe() {
  const location = useLocation()

  return <output data-testid="location-search">{location.search}</output>
}
