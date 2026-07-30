import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const forbiddenPatterns = [
  /\[\s*a\s+compl[ée]ter\s*\]/iu,
  /\[\s*to\s+be\s+completed\s*\]/iu,
  /\[\s*يستكمل\s*\]/u,
  /\b(rest(?:e|ent)\s+[àa]\s+compl[ée]ter)\b/iu,
  /\b(remain(?:s)?\s+to\s+be\s+completed)\b/iu,
  /قيد الاستكمال/u,
]

export async function assertNoLegalPlaceholders(roots) {
  const violations = []

  for (const root of roots) {
    for (const file of await listTextFiles(root)) {
      const content = await readFile(file, 'utf8')

      if (forbiddenPatterns.some((pattern) => pattern.test(content))) {
        violations.push(path.relative(process.cwd(), file))
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(`Forbidden legal placeholders found in: ${violations.join(', ')}`)
  }
}

async function listTextFiles(root) {
  try {
    if (!(await stat(root)).isDirectory()) {
      return []
    }
  } catch {
    return []
  }

  const files = []

  for (const entry of await readdir(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name)

    if (entry.isDirectory()) {
      files.push(...await listTextFiles(target))
    } else if (/\.(?:html|js|jsx|json|css|txt)$/iu.test(entry.name)) {
      files.push(target)
    }
  }

  return files
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  await assertNoLegalPlaceholders([
    path.resolve(process.cwd(), 'src'),
    path.resolve(process.cwd(), 'dist'),
  ])
  console.log('Legal placeholder check passed.')
}
