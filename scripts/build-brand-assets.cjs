// Run from the repository root with the existing frontend Playwright installed.
// Technical rasterization only: preserve the supplied artwork and its ratio.
const fs = require('node:fs')
const { chromium } = require('../frontend/node_modules/playwright')

async function main() {
  fs.mkdirSync('frontend/public/brand', { recursive: true })
  fs.mkdirSync('mobile/assets/brand', { recursive: true })
  for (const [source, destination] of [
    ['YaZoo logo.svg', 'frontend/public/brand/yazoo-symbol.svg'],
    ['YaZoo logo (1).svg', 'frontend/public/brand/yazoo-logo.svg'],
    ['YaZoo logo.png', 'frontend/public/brand/yazoo-logo.png'],
    ['YaZoo logo.png', 'mobile/assets/brand/yazoo-logo.png'],
  ]) fs.copyFileSync(`docs/logo/${source}`, destination)

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const svg = fs.readFileSync('docs/logo/YaZoo logo.svg', 'utf8')
    async function render(path, size, fraction = 1, background = 'transparent') {
      await page.setViewportSize({ width: size, height: size })
      await page.setContent(`<style>
        html,body{margin:0;width:100%;height:100%;background:${background}}
        body{display:flex;align-items:center;justify-content:center}
        svg{width:${fraction * 100}%;height:${fraction * 100}%}
      </style>${svg}`)
      await page.screenshot({ path, omitBackground: background === 'transparent' })
    }
    await render('mobile/assets/brand/yazoo-symbol.png', 512)
    await render('mobile/assets/brand/app-icon.png', 1024, 0.8, '#FAF7FF')
    await render('mobile/assets/brand/adaptive-foreground.png', 432, 0.6)
    await render('mobile/assets/brand/favicon.png', 192, 0.8, '#FAF7FF')
    for (const [file, size, fraction] of [
      ['icon-192.png', 192, 0.8], ['icon-512.png', 512, 0.8],
      ['icon-maskable-512.png', 512, 0.6], ['apple-touch-icon.png', 180, 0.8],
    ]) await render(`frontend/public/${file}`, size, fraction, '#FAF7FF')
  } finally {
    await browser.close()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
