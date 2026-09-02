import { describe, expect, it } from 'vitest'
import {
  copyEditorEntries,
  migrateCopyEditorDraftValues,
} from '../../lib/copyEditor'

describe('copy editor project narratives', () => {
  it('exposes the overview as one Markdown narrative field', () => {
    const loopioEntries = copyEditorEntries.filter(
      entry => entry.group === 'Loopio',
    )
    const overview = loopioEntries.find(entry =>
      entry.id.endsWith('.overviewMarkdown'),
    )

    expect(overview).toMatchObject({
      label: 'cover: narrative',
      blockId: 'portfolio.projects.loopio.cover_image',
    })
    expect(overview?.value).toMatch(
      /^# Proving a better Loopio—then making it buildable by everyone else\n\n/,
    )
    expect(
      loopioEntries.some(
        entry =>
          entry.id.endsWith('.headlineMarkdown') ||
          entry.id.endsWith('.descriptionMarkdown'),
      ),
    ).toBe(false)
  })

  it('combines saved legacy headline and introduction drafts', () => {
    const migrated = migrateCopyEditorDraftValues({
      'portfolio.projects.loopio.headlineMarkdown': 'A revised headline',
      'portfolio.projects.loopio.descriptionMarkdown':
        'A revised introduction.',
    })

    expect(migrated['portfolio.projects.loopio.overviewMarkdown']).toBe(
      '# A revised headline\n\nA revised introduction.',
    )
    expect(migrated).not.toHaveProperty(
      'portfolio.projects.loopio.headlineMarkdown',
    )
    expect(migrated).not.toHaveProperty(
      'portfolio.projects.loopio.descriptionMarkdown',
    )
  })
})
