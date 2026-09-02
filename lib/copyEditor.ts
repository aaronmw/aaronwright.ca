import { portfolioSlides } from './portfolio'
import {
  composePortfolioNarrative,
  parsePortfolioNarrative,
} from './portfolioNarrative'

export type CopyEditorEntry = {
  id: string
  group: string
  label: string
  value: string
  blockId?: string
  control?: 'input' | 'textarea'
  media?: {
    src: string
    alt: string
    type: 'image' | 'video'
  }
  rows?: number
}

const siteEntries: CopyEditorEntry[] = [
  {
    id: 'site.home.name',
    group: 'Site and navigation',
    label: 'Site name',
    value: 'Aaron M. Wright',
    rows: 2,
  },
  {
    id: 'site.home.tagline',
    group: 'Site and navigation',
    label: 'Homepage tagline',
    value: 'Product design · frontend systems',
    rows: 2,
  },
  {
    id: 'site.home.navigation.work',
    group: 'Site and navigation',
    label: 'Work navigation label',
    value: 'Carousel',
    rows: 2,
  },
  {
    id: 'site.home.navigation.resume',
    group: 'Site and navigation',
    label: 'Résumé navigation label',
    value: 'Resume',
    rows: 2,
  },
  {
    id: 'site.metadata.homeDescription',
    group: 'Site and navigation',
    label: 'Homepage search description',
    value:
      'Selected product design and frontend systems work by Aaron M. Wright.',
    rows: 3,
  },
  {
    id: 'site.metadata.workDescription',
    group: 'Site and navigation',
    label: 'Work page search description',
    value:
      'Selected product design and development work by Aaron M. Wright, including Figma tools, content systems, web apps, and AI-assisted projects.',
    rows: 4,
  },
]

const portfolioInterfaceEntries: CopyEditorEntry[] = [
  {
    id: 'interface.portfolio.projectLabel',
    group: 'Portfolio interface',
    label: 'Project field label',
    value: 'Project',
    rows: 2,
  },
  {
    id: 'interface.portfolio.companyLabel',
    group: 'Portfolio interface',
    label: 'Company field label',
    value: 'Company / product',
    rows: 2,
  },
  {
    id: 'interface.portfolio.summaryLabel',
    group: 'Portfolio interface',
    label: 'Summary field label',
    value: 'Summary / intro',
    rows: 2,
  },
  {
    id: 'interface.portfolio.closeHint',
    group: 'Portfolio interface',
    label: 'Close shortcut hint',
    value: 'Press ESC to close',
    rows: 2,
  },
]

function cleanEditableCopy(value: string) {
  return value
    .replace(/<abbr title="[^"]+">([^<]+)<\/abbr>/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function mediaType(src: string): 'image' | 'video' {
  return /\.(?:webm|mp4|m4v|ogv|ogg)(?:$|\?)/i.test(src) ? 'video' : 'image'
}

function projectEntries() {
  return portfolioSlides.flatMap<CopyEditorEntry>(project => {
    const prefix = `portfolio.projects.${project.slug}`
    const entries: CopyEditorEntry[] = [
      {
        id: `${prefix}.title`,
        group: project.title,
        label: 'Project title',
        value: cleanEditableCopy(project.title),
        rows: 2,
      },
      {
        id: `${prefix}.blurb`,
        group: project.title,
        label: 'Project summary',
        value: cleanEditableCopy(project.blurb),
        rows: 4,
      },
    ]

    if (project.rolesMarkdown) {
      entries.push({
        id: `${prefix}.rolesMarkdown`,
        group: project.title,
        label: 'Role',
        value: cleanEditableCopy(project.rolesMarkdown),
        rows: 2,
      })
    }

    if (project.dates) {
      entries.push({
        id: `${prefix}.dates`,
        group: project.title,
        label: 'Dates',
        value: cleanEditableCopy(project.dates),
        rows: 2,
      })
    }

    const overviewEntry: CopyEditorEntry = {
      id: `${prefix}.overviewMarkdown`,
      group: project.title,
      label: 'Overview narrative',
      value: cleanEditableCopy(project.overviewMarkdown),
      rows: 10,
    }

    if (project.cover_image) {
      const coverPrefix = `${prefix}.cover_image`
      const coverMedia = {
        src: project.cover_image.src,
        alt: cleanEditableCopy(project.cover_image.alt),
        type: mediaType(project.cover_image.src),
      } as const

      entries.push({
        id: `${coverPrefix}.alt`,
        group: project.title,
        label: 'Cover image description',
        value: cleanEditableCopy(project.cover_image.alt),
        blockId: coverPrefix,
        control: 'input',
        media: coverMedia,
        rows: 3,
      })
      entries.push({
        ...overviewEntry,
        label: `${project.cover_image.slug}: narrative`,
        blockId: coverPrefix,
        media: coverMedia,
      })
    } else if (!project.screenshots[0] || project.screenshots[0].description) {
      entries.push(overviewEntry)
    }

    project.screenshots.forEach((screenshot, screenshotIndex) => {
      const screenshotPrefix = `${prefix}.screenshots.${screenshot.slug}`
      const screenshotMedia = {
        src: screenshot.src,
        alt: cleanEditableCopy(screenshot.alt),
        type: mediaType(screenshot.src),
      } as const

      entries.push({
        id: `${screenshotPrefix}.alt`,
        group: project.title,
        label: `${screenshot.slug}: image description`,
        value: cleanEditableCopy(screenshot.alt),
        blockId: screenshotPrefix,
        control: 'input',
        media: screenshotMedia,
      })

      if (
        !project.cover_image &&
        screenshotIndex === 0 &&
        !screenshot.description
      ) {
        entries.push({
          ...overviewEntry,
          label: `${screenshot.slug}: narrative`,
          blockId: screenshotPrefix,
          media: screenshotMedia,
        })
      }

      if (screenshot.description) {
        entries.push({
          id: `${screenshotPrefix}.description`,
          group: project.title,
          label: `${screenshot.slug}: narrative`,
          value: cleanEditableCopy(screenshot.description),
          blockId: screenshotPrefix,
          media: screenshotMedia,
          rows: 10,
        })
      }
    })

    return entries
  })
}

export function migrateCopyEditorDraftValues(values: Record<string, string>) {
  const migrated = { ...values }

  portfolioSlides.forEach(project => {
    const prefix = `portfolio.projects.${project.slug}`
    const overviewId = `${prefix}.overviewMarkdown`
    const legacyHeadlineId = `${prefix}.headlineMarkdown`
    const legacyDescriptionId = `${prefix}.descriptionMarkdown`

    if (typeof migrated[overviewId] !== 'string') {
      const legacyHeadline = migrated[legacyHeadlineId]
      const legacyDescription = migrated[legacyDescriptionId]

      if (
        typeof legacyHeadline === 'string' ||
        typeof legacyDescription === 'string'
      ) {
        const current = parsePortfolioNarrative(
          cleanEditableCopy(project.overviewMarkdown),
        )
        migrated[overviewId] = composePortfolioNarrative(
          typeof legacyHeadline === 'string'
            ? legacyHeadline
            : current.titleMarkdown,
          typeof legacyDescription === 'string'
            ? legacyDescription
            : current.bodyMarkdown,
        )
      }
    }

    delete migrated[legacyHeadlineId]
    delete migrated[legacyDescriptionId]
  })

  return migrated
}

export const copyEditorEntries = [
  ...siteEntries,
  ...portfolioInterfaceEntries,
  ...projectEntries(),
]
