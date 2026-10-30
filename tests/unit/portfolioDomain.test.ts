import { describe, expect, it } from 'vitest'
import { portfolioSlides, type PortfolioProject } from '../../lib/portfolio'
import {
  getProjectMediaScreenshots,
  getProjectSlides,
  isVideoScreenshot,
} from '../../components/portfolio/domain/slides'

const projects: PortfolioProject[] = [
  {
    id: 'about-me',
    slug: 'about-me',
    title: 'About Me',
    seo: { title: 'About Aaron M. Wright', description: 'About Aaron.' },
    blurb: '',
    overviewMarkdown: '',
    screenshots: [],
  },
  {
    id: 'project-two',
    slug: 'project-two',
    title: 'Project Two',
    seo: { title: 'Project Two', description: 'A second project.' },
    blurb: '',
    overviewMarkdown: '',
    screenshots: [
      {
        id: 'overview',
        slug: 'overview',
        src: '/overview.png',
        alt: '1 of 2: Project Two overview',
      },
      {
        id: 'motion',
        slug: 'motion',
        src: '/motion.webm?version=1',
        alt: 'Motion study',
      },
    ],
  },
]

describe('portfolio project order', () => {
  it('uses the curated section sequence', () => {
    expect(portfolioSlides.map(project => project.slug)).toEqual([
      'about-me',
      'loopio',
      'freshbooks',
      'informal-systems',
      'aarons-toolbox',
      'nextphrase',
    ])
  })
})

describe('portfolio slide derivation', () => {
  it('keeps every media item in canonical order without a synthetic intro slide', () => {
    const slides = getProjectSlides(projects[1])
    const coveredProject = {
      ...projects[1],
      cover_image: {
        id: 'cover',
        slug: 'cover',
        src: '/cover.png',
        alt: 'Cover',
      },
    }
    const coveredSlides = getProjectSlides(coveredProject)

    expect(slides.map(({ id, kind }) => [id, kind])).toEqual([
      ['overview', 'screenshot'],
      ['motion', 'screenshot'],
    ])
    expect(coveredSlides.map(({ id, kind }) => [id, kind])).toEqual([
      ['cover', 'screenshot'],
      ['overview', 'screenshot'],
      ['motion', 'screenshot'],
    ])
    expect(getProjectMediaScreenshots(coveredProject)).toEqual([
      coveredProject.cover_image,
      ...projects[1].screenshots,
    ])
  })

  it('uses one description slide only for a media-free project', () => {
    const aboutMeSlides = getProjectSlides(projects[0])

    expect(aboutMeSlides).toHaveLength(1)
    expect(aboutMeSlides[0].kind).toBe('description')
    expect(getProjectMediaScreenshots(projects[0])).toEqual([])
    expect(isVideoScreenshot(projects[1].screenshots[1])).toBe(true)
  })
})
