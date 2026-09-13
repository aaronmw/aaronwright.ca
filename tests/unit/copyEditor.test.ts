import { describe, expect, it } from 'vitest'
import {
  copyEditorEntries,
  migrateCopyEditorDraftValues,
} from '../../lib/copyEditor'

describe('copy editor project narratives', () => {
  it('offers the revised About Me biography and all three supporting lists as originals', () => {
    const biography = copyEditorEntries.find(
      entry => entry.id === 'portfolio.projects.about-me.overviewMarkdown',
    )
    const details = copyEditorEntries.find(
      entry => entry.id === 'portfolio.projects.about-me.detailsMarkdown',
    )

    expect(biography?.value.split(/\n\s*\n/)).toHaveLength(5)
    expect(details?.value.match(/^## /gm)).toHaveLength(3)
    expect(details?.value.match(/^- /gm)).toHaveLength(15)
    expect(details).not.toHaveProperty('media')
  })

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
    expect(overview?.value).toMatch(/^# [^\n]+\n\n\S/)
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
