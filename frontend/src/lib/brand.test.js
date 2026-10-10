import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { brand } from './brand'

const publicPath = resolve(process.cwd(), 'public')

describe('startup visual identity', () => {
  it('uses the supplied static symbol and ships the original full logo', () => {
    expect(brand.logo).toBe('/brand/yazoo-symbol.svg')
    for (const name of ['yazoo-symbol.svg', 'yazoo-logo.svg', 'yazoo-logo.png']) {
      expect(existsSync(resolve(publicPath, 'brand', name))).toBe(true)
    }
    const svg = readFileSync(resolve(publicPath, 'brand/yazoo-symbol.svg'), 'utf8')
    expect(svg).not.toMatch(/<script\b|\bonload\s*=|javascript:|<foreignObject\b/i)
  })

  it('does not load the historical brand assets from runtime sources or the worker', () => {
    const source = resolve(process.cwd(), 'src')
    const files = readdirSync(source, { recursive: true }).filter(name => /\.(js|jsx)$/.test(name) && !name.endsWith('.test.js') && !name.endsWith('.test.jsx'))
    for (const file of files) expect(readFileSync(`${source}/${file}`, 'utf8')).not.toMatch(/yazoo-logo\.webp|\/favicon\.svg/)
    expect(readFileSync(resolve(publicPath, 'sw.js'), 'utf8')).toContain(brand.logo)
    expect(readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')).toContain(brand.logo)
  })
})
