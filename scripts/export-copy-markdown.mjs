import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const projectRoot = process.cwd()
const siteUrl = 'https://aaronwright.ca'

function loadTypeScriptModule(relativePath, dependencies = {}) {
  const filename = path.join(projectRoot, relativePath)
  const source = fs.readFileSync(filename, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText
  const module = { exports: {} }
  const evaluate = vm.runInThisContext(
    `(function (require, module, exports) { ${compiled}\n})`,
    { filename },
  )

  evaluate(
    id => {
      if (id in dependencies) return dependencies[id]
      throw new Error(`Unsupported import "${id}" in ${relativePath}`)
    },
    module,
    module.exports,
  )

  return module.exports
}

function demoteHeadings(markdown, parentLevel) {
  return markdown.replace(/^(#{1,6})(\s+)/gm, (_, hashes, spacing) => {
    const level = Math.min(
      6,
      Math.max(parentLevel + 1, hashes.length + parentLevel - 1),
    )
    return `${'#'.repeat(level)}${spacing}`
  })
}

function humanize(value) {
  const words = value.replace(/[-_]+/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function mediaHeading(block) {
  const firstEntry = block.entries[0]

  if (firstEntry.id.includes('.cover_image.')) return 'Cover image'
  if (firstEntry.blockId) return humanize(firstEntry.blockId.split('.').at(-1))

  return firstEntry.label.replace(/:\s*.+$/, '')
}

function fieldHeading(entry) {
  if (entry.id.endsWith('.alt')) return 'Image description'
  if (entry.id.endsWith('.description')) return 'Narrative'
  return entry.label
}

function mediaMarkdown(media) {
  const source = media.src.startsWith('/')
    ? `${siteUrl}${media.src}`
    : media.src

  return media.type === 'video'
    ? `[Video: ${media.alt}](${source})`
    : `![${media.alt}](${source})`
}

const portfolio = loadTypeScriptModule('lib/portfolio.ts')
const { copyEditorEntries } = loadTypeScriptModule('lib/copyEditor.ts', {
  '@/lib/portfolio': portfolio,
})

const groups = new Map()

for (const entry of copyEditorEntries) {
  const blocks = groups.get(entry.group) ?? []
  const blockId = entry.blockId ?? entry.id
  const existingBlock = blocks.find(block => block.id === blockId)

  if (existingBlock) {
    existingBlock.entries.push(entry)
    existingBlock.media ??= entry.media
  } else {
    blocks.push({ id: blockId, entries: [entry], media: entry.media })
  }

  groups.set(entry.group, blocks)
}

const lines = ['# Aaron M. Wright — Website Copy', '']

for (const [group, blocks] of groups) {
  lines.push(`## ${group}`, '')

  for (const block of blocks) {
    if (!block.media) {
      const entry = block.entries[0]
      lines.push(`### ${entry.label}`, '', demoteHeadings(entry.value, 3), '')
      continue
    }

    lines.push(`### ${mediaHeading(block)}`, '', mediaMarkdown(block.media), '')

    for (const entry of block.entries) {
      lines.push(
        `#### ${fieldHeading(entry)}`,
        '',
        demoteHeadings(entry.value, 4),
        '',
      )
    }
  }
}

fs.writeFileSync(
  path.join(projectRoot, 'rewrite-source.md'),
  `${lines.join('\n').trim()}\n`,
)
