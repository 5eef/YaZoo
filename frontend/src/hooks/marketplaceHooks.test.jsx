import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../contexts/I18nContext'
import * as animalService from '../services/marketplace/animalsMarketplaceService'
import * as productService from '../services/marketplace/productsMarketplaceService'
import { useAnimalsMarketplace } from './useAnimalsMarketplace'
import { useProductsMarketplace } from './useProductsMarketplace'

vi.mock('../services/marketplace/animalsMarketplaceService', () => ({
  createAnimal: vi.fn(), deleteAnimal: vi.fn(), fetchAnimals: vi.fn(), updateAnimal: vi.fn(),
}))
vi.mock('../services/marketplace/productsMarketplaceService', () => ({
  createProduct: vi.fn(), deleteProduct: vi.fn(), fetchProducts: vi.fn(), updateProduct: vi.fn(),
}))

function wrapper({ children }) {
  return <MemoryRouter><I18nProvider>{children}</I18nProvider></MemoryRouter>
}

function deferred() {
  let resolve
  const promise = new Promise((resolvePromise) => { resolve = resolvePromise })
  return { promise, resolve }
}

describe.each([
  ['animals', useAnimalsMarketplace, animalService],
  ['products', useProductsMarketplace, productService],
])('%s marketplace hook', (kind, useMarketplace, service) => {
  const fetchMethod = kind === 'animals' ? 'fetchAnimals' : 'fetchProducts'
  const deleteMethod = kind === 'animals' ? 'deleteAnimal' : 'deleteProduct'
  const itemsKey = kind === 'animals' ? 'animals' : 'products'

  beforeEach(() => {
    localStorage.setItem('yazoo-locale', 'fr')
    service[fetchMethod].mockResolvedValue([])
    service[deleteMethod].mockResolvedValue({ data: {} })
  })

  it('ne charge qu une fois au montage et qu une fois apres une nouvelle recherche URL', async () => {
    const { result } = renderHook(() => useMarketplace(), { wrapper })

    await waitFor(() => expect(service[fetchMethod]).toHaveBeenCalledTimes(1))

    act(() => {
      result.current.handleFilterChange('q')({ target: { value: 'atlas' } })
    })
    await act(async () => {
      await result.current.handleSearch({ preventDefault: vi.fn() })
    })

    await waitFor(() => expect(service[fetchMethod]).toHaveBeenCalledTimes(2))
  })

  it('ignore une ancienne reponse arrivee apres la requete la plus recente', async () => {
    const { result } = renderHook(() => useMarketplace(), { wrapper })
    await waitFor(() => expect(service[fetchMethod]).toHaveBeenCalledTimes(1))

    const oldRequest = deferred()
    const latestRequest = deferred()
    service[fetchMethod]
      .mockImplementationOnce(() => oldRequest.promise)
      .mockImplementationOnce(() => latestRequest.promise)

    let oldAction
    let latestAction
    act(() => {
      oldAction = result.current.applyQuickFilter('category', 'old')
      latestAction = result.current.applyQuickFilter('category', 'latest')
    })

    await act(async () => {
      latestRequest.resolve([{ id: 2, name: 'Latest' }])
      await latestAction
    })
    await act(async () => {
      oldRequest.resolve([{ id: 1, name: 'Old' }])
      await oldAction
    })

    expect(result.current[itemsKey]).toEqual([{ id: 2, name: 'Latest' }])
  })

  it('annule puis confirme explicitement une suppression', async () => {
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
    vi.stubGlobal('confirm', confirm)
    const { result } = renderHook(() => useMarketplace(), { wrapper })
    await waitFor(() => expect(service[fetchMethod]).toHaveBeenCalledTimes(1))

    await act(async () => result.current.handleDelete(42))
    expect(service[deleteMethod]).not.toHaveBeenCalled()

    await act(async () => result.current.handleDelete(42))
    expect(service[deleteMethod]).toHaveBeenCalledWith(42)
    expect(confirm).toHaveBeenCalledTimes(2)
  })
})
