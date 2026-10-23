// Copies official Android artwork verbatim; rasterizes only launcher sizes.
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('../frontend/node_modules/playwright')
const root = path.resolve(__dirname, '..')
async function main() {
  const sources = [
    ['YaZoo.png', 'yazoo-inapp-2026.png'],
    ['YaZoo logo light.png', 'login-light-2026.png'],
    ['YaZoo logo dark.png', 'login-dark-2026.png'],
  ]
  for (const [source] of sources) {
    if (!fs.existsSync(path.join(root, 'docs/logo', source))) throw new Error(`Missing official brand source: docs/logo/${source}`)
  }
  const destination = path.join(root, 'frontend/public')
  fs.mkdirSync(path.join(destination, 'brand'), { recursive: true })
  for (const [source, target] of sources) fs.copyFileSync(path.join(root, 'docs/logo', source), path.join(destination, 'brand', target))
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 })
    const data = fs.readFileSync(path.join(root, 'docs/logo/YaZoo.png')).toString('base64')
    for (const [file, size, fraction] of [
      ['icon-192.png', 192, 0.8], ['icon-512.png', 512, 0.8],
      ['icon-maskable-512.png', 512, 0.6], ['apple-touch-icon.png', 180, 0.8],
    ]) {
      await page.setViewportSize({ width: size, height: size })
      await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:#FAF7FF}body{display:flex;align-items:center;justify-content:center}img{width:${fraction*100}%;height:${fraction*100}%;object-fit:contain}</style><img src="data:image/png;base64,${data}">`)
      await page.locator('img').evaluate(image => image.decode())
      await page.screenshot({ path: path.join(destination, file) })
    }
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
