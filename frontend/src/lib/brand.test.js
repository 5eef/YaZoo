import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { brand } from './brand'

const publicPath = resolve(process.cwd(), 'public')

describe('startup visual identity', () => {
  it('uses the supplied static symbol and ships the original full logo', () => {
    expect(brand.logo).toBe('/brand/yazoo-inapp-2026.png')
    for (const name of ['yazoo-inapp-2026.png', 'login-light-2026.png', 'login-dark-2026.png']) {
      expect(existsSync(resolve(publicPath, 'brand', name))).toBe(true)
    }
    for (const [web, mobile] of [['yazoo-inapp-2026.png', 'yazoo-inapp-logo.png'], ['login-light-2026.png', 'login-logo-light.png'], ['login-dark-2026.png', 'login-logo-dark.png']]) {
      expect(readFileSync(resolve(publicPath, 'brand', web))).toEqual(readFileSync(resolve(process.cwd(), '../mobile/assets/brand', mobile)))
    }
  })

  it('does not load the historical brand assets from runtime sources or the worker', () => {
    const source = resolve(process.cwd(), 'src')
    const files = readdirSync(source, { recursive: true }).filter(name => /\.(js|jsx)$/.test(name) && !name.endsWith('.test.js') && !name.endsWith('.test.jsx'))
    for (const file of files) expect(readFileSync(`${source}/${file}`, 'utf8')).not.toMatch(/yazoo-logo\.webp|\/favicon\.svg|yazoo-symbol\.svg|yazoo-logo\.svg/)
    expect(readFileSync(resolve(publicPath, 'sw.js'), 'utf8')).toContain(brand.logo)
    expect(readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')).toContain(brand.logo)
  })
})
