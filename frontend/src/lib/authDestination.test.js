import { describe, expect, it } from 'vitest'
import { loginFor, safeAuthDestination } from './authDestination'

describe('auth destination', () => {
  it('preserves the veterinarian and slot', () => {
    const path = '/veterinarian-appointments?veterinarian=12&slot=45'
    expect(safeAuthDestination(path)).toBe(path)
    expect(new URL(loginFor(path), 'https://yazoo.test').searchParams.get('returnTo')).toBe(path)
  })
  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/%2f%2fevil.test', '/login', '/admin', '/feed\n', '/unknown'])('rejects %s', (value) => {
    expect(safeAuthDestination(value)).toBe('/feed')
  })
  it.each(['/marketplace/animals/12', '/marketplace/products/2', '/reservations', '/reservations/3/invoice', '/messages?user=8', '/orders/history', '/communities/4', '/settings/privacy', '/settings/professional-verification', '/notifications', '/search?q=cat'])('preserves existing internal route %s', (value) => {
    expect(safeAuthDestination(value)).toBe(value)
  })
})
