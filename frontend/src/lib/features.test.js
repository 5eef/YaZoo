import { afterEach, describe, expect, it, vi } from 'vitest'
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })
describe('pilot feature defaults', () => {
  it('hides public animals by default and preserves the care journey', async () => {
    vi.stubEnv('VITE_STARTUP_PILOT', undefined)
    vi.stubEnv('VITE_ANIMAL_LISTINGS_PUBLIC', undefined)
    const { features } = await import('./features')
    expect(features.startupPilot).toBe(true)
    expect(features.animalListingsPublic).toBe(false)
    expect(features.payments).toBe(false)
  })
  it('can restore the historical showcase explicitly', async () => {
    vi.stubEnv('VITE_STARTUP_PILOT', 'false')
    vi.stubEnv('VITE_ANIMAL_LISTINGS_PUBLIC', undefined)
    const { features } = await import('./features')
    expect(features.startupPilot).toBe(false)
    expect(features.animalListingsPublic).toBe(true)
  })
})
