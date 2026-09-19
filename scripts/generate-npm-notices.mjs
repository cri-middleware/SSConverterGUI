#!/usr/bin/env node
// Appends the frontend (npm) third-party license notices to THIRD_PARTY_NOTICES.md.
//
// `cargo about` covers only the Rust dependency graph, but Tauri embeds the
// compiled frontend bundle into the same binary, so the npm packages whose code
// ends up in `dist/` need their notices shipped too.
//
// Mirrors about.toml's philosophy: a dependency whose license text cannot be
// located is a hard failure, not a silent omission — that is the signal to
// review it and add a fallback under `licenses/<SPDX-ID>.txt`.
//
// Usage: node scripts/generate-npm-notices.mjs [output-file]

import { execFileSync } from 'node:child_process'
import { appendFileSync, readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outFile = resolve(repoRoot, process.argv[2] ?? 'THIRD_PARTY_NOTICES.md')
const fallbackDir = join(repoRoot, 'licenses')

// Files that carry actual license text. `.spdx` is metadata, not a license text,
// so it is deliberately excluded.
const LICENSE_FILE_RE = /^(licen[cs]e|copying|notice)/i

/** Group key for an SPDX expression: `A OR B` and `B OR A` are the same set. */
function normalizeExpression(expression) {
  if (!/\sOR\s/i.test(expression) || /\sAND\s|\(|\)/i.test(expression)) {
    // Anything with AND or parentheses has order-sensitive meaning; keep verbatim.
    return expression
  }
  return expression
    .split(/\s+OR\s+/i)
    .map((id) => id.trim())
    .sort()
    .join(' OR ')
}

function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Every license text shipped inside a package directory. */
function readLicenseTexts(packagePath) {
  if (!existsSync(packagePath)) return []
  return readdirSync(packagePath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && LICENSE_FILE_RE.test(entry.name) && !entry.name.endsWith('.spdx'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({ name: entry.name, text: readFileSync(join(packagePath, entry.name), 'utf8').trim() }))
    .filter((file) => file.text.length > 0)
}

/** Committed fallback text, used when a package ships no license file of its own. */
function readFallbackTexts(expression) {
  const results = []
  for (const id of expression.split(/\s+(?:OR|AND)\s+/i)) {
    const path = join(fallbackDir, `${id.trim()}.txt`)
    if (existsSync(path)) {
      results.push({ name: `licenses/${id.trim()}.txt`, text: readFileSync(path, 'utf8').trim() })
    }
  }
  return results
}

const raw = execFileSync('pnpm', ['licenses', 'list', '--prod', '--json'], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
  // On Windows `pnpm` is a .cmd shim, which Node refuses to spawn directly.
  // The arguments are fixed literals with no spaces, so a shell is safe here.
  shell: process.platform === 'win32',
})
const byLicense = JSON.parse(raw)

// Collapse `pnpm licenses list`'s per-expression buckets into normalized groups.
const groups = new Map()
for (const [expression, packages] of Object.entries(byLicense)) {
  const key = normalizeExpression(expression)
  const group = groups.get(key) ?? { expression: key, packages: [] }
  group.packages.push(...packages)
  groups.set(key, group)
}

if (groups.size === 0) {
  console.error('No production npm dependencies found — is node_modules installed?')
  process.exit(1)
}

const sortedGroups = [...groups.values()].sort((a, b) => a.expression.localeCompare(b.expression))
const missing = []

for (const group of sortedGroups) {
  group.packages.sort((a, b) => a.name.localeCompare(b.name))

  // Dedupe by content: sibling packages from one monorepo ship identical texts.
  const texts = new Map()
  for (const pkg of group.packages) {
    for (const path of pkg.paths ?? []) {
      for (const file of readLicenseTexts(path)) {
        if (!texts.has(file.text)) texts.set(file.text, file.name)
      }
    }
  }
  if (texts.size === 0) {
    for (const file of readFallbackTexts(group.expression)) {
      if (!texts.has(file.text)) texts.set(file.text, file.name)
    }
  }
  if (texts.size === 0) {
    missing.push(group.expression)
  }
  group.texts = texts
}

if (missing.length > 0) {
  console.error(
    `No license text found for: ${missing.join(', ')}.\n` +
      `The package ships none and there is no fallback. Add the full text to ` +
      `licenses/<SPDX-ID>.txt (one file per identifier) and re-run.`,
  )
  process.exit(1)
}

const lines = [
  '',
  '## Frontend (npm) Dependencies',
  '',
  'The application embeds a compiled frontend bundle in the same binary, so the',
  'notices for the npm packages contributing code to that bundle are reproduced here.',
  '',
  '### Overview of Licenses',
  '',
  ...sortedGroups.map((g) => `- [${g.expression}](#npm-${slug(g.expression)}) (${g.packages.length})`),
  '',
  '### Detail of Licenses',
  '',
]

for (const group of sortedGroups) {
  lines.push(`#### <a id="npm-${slug(group.expression)}"></a>${group.expression}`, '', 'Used by:')
  for (const pkg of group.packages) {
    const version = (pkg.versions ?? []).join(', ')
    const homepage = pkg.homepage ? ` (${pkg.homepage})` : ''
    lines.push(`- **${pkg.name} ${version}**${homepage}`)
  }
  lines.push('')
  for (const text of group.texts.keys()) {
    lines.push('```text', text, '```', '')
  }
  lines.push('---', '')
}

appendFileSync(outFile, lines.join('\n'))

const packageCount = sortedGroups.reduce((n, g) => n + g.packages.length, 0)
console.log(`Appended notices for ${packageCount} npm package(s) to ${outFile}`)
