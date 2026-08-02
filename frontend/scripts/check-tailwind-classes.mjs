import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const sourceRoot = path.resolve(process.cwd(), 'src')
const distAssetsRoot = path.resolve(process.cwd(), 'dist', 'assets')
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx'])
const numericOpacityClass = /^(?:[a-z-]+:)*(?:bg|text|border|ring|shadow|from|via|to)-\S+\/\d{1,3}$/
const paletteClass = /^(?:[a-z-]+:)*(?:bg|text|border|ring|from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d{2,3})(?:\/\d{1,3})?$/
const supportedPaletteShades = new Set(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'])

if (!existsSync(distAssetsRoot)) {
  throw new Error('Build assets are missing. Run `npm run build` before this audit.')
}

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = path.join(directory, entry)
    return statSync(absolutePath).isDirectory() ? walk(absolutePath) : absolutePath
  })
}

function normalizeToken(rawToken) {
  return rawToken.replace(/^[`'"({]+/, '').replace(/[`'",;)}]+$/, '')
}

function escapeCssClass(className) {
  return className.replace(/([!"#$%&'()*+,./:;<=>?@[\]\\^`{|}~])/g, '\\$1')
}

const candidates = new Set()
const invalidPaletteClasses = new Set()

for (const filePath of walk(sourceRoot)) {
  if (!sourceExtensions.has(path.extname(filePath))) continue

  for (const rawToken of readFileSync(filePath, 'utf8').split(/\s+/)) {
    const token = normalizeToken(rawToken)
    if (numericOpacityClass.test(token) && !token.includes('${')) candidates.add(token)

    const paletteMatch = token.match(paletteClass)
    if (paletteMatch && !supportedPaletteShades.has(paletteMatch[2])) {
      invalidPaletteClasses.add(token)
    }
  }
}

if (invalidPaletteClasses.size > 0) {
  console.error(`Unsupported default Tailwind palette class(es):`)
  for (const candidate of [...invalidPaletteClasses].sort()) console.error(`- ${candidate}`)
  process.exit(1)
}

const generatedCss = walk(distAssetsRoot)
  .filter((filePath) => filePath.endsWith('.css'))
  .map((filePath) => readFileSync(filePath, 'utf8'))
  .join('\n')

const missing = [...candidates]
  .filter((candidate) => !generatedCss.includes(escapeCssClass(candidate)))
  .sort()

if (missing.length > 0) {
  console.error(`Tailwind did not generate ${missing.length} numeric-opacity class(es):`)
  for (const candidate of missing) console.error(`- ${candidate}`)
  process.exitCode = 1
} else {
  console.log(`Tailwind generated all ${candidates.size} numeric-opacity classes used by the source.`)
}
