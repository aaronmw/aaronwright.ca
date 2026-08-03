import { describe, expect, it } from 'vitest'
import { portfolioSlides, type PortfolioProject } from '../../lib/portfolio'
import {
  getCanonicalCarouselEntries,
  getCanonicalRenderedCarouselIndex,
  getFractionalCarouselPosition,
  getLoopingCarouselEntries,
  getNavigationTravelDuration,
  isCarouselBoundaryJump,
  positiveModulo,
} from '../../components/portfolio/domain/carousel'
import {
  pageTitle,
  parsePortfolioRoute,
  projectUrl,
  slideNavigationTitle,
} from '../../components/portfolio/domain/routing'
import {
  carouselMediaKey,
  getInitialSlideIndexes,
  getProjectMediaScreenshots,
  getProjectSlides,
  getProjectSlidesBySlug,
  getSlideMediaKey,
  getVerticalTargetProjectIndex,
  isAboutMeTextSlide,
  isModalScreenshotSlide,
  isVideoScreenshot,
  modalMediaKey,
} from '../../components/portfolio/domain/slides'
import {
  buildActiveProjectColorFromHex,
  buildActiveProjectColors,
  buildProjectColors,
  getContrastAgainstBlack,
  getProjectColor,
} from '../../components/portfolio/domain/theme'

const projects: PortfolioProject[] = [
  {
    id: 'about-me',
    slug: 'about-me',
    title: 'About Me',
    blurb: '',
    descriptionMarkdown: '',
    screenshots: [
      {
        id: 'about-me-overview',
        slug: 'overview',
        src: '/about-me.png',
        alt: 'About Me overview',
      },
    ],
  },
  {
    id: 'project-two',
    slug: 'project-two',
    title: 'Project Two',
    blurb: '',
    descriptionMarkdown: '',
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
      'informal-systems',
      'aarons-toolbox',
      'nextphrase',
      'mini-series-browser',
    ])
  })
})

describe('portfolio slide derivation', () => {
  it('derives descriptions, screenshots, and initial indexes', () => {
    const slides = getProjectSlides(projects[1])

    expect(slides.map(({ id, kind }) => [id, kind])).toEqual([
      ['project-two-description', 'description'],
      ['overview', 'screenshot'],
      ['motion', 'screenshot'],
    ])
    expect(getInitialSlideIndexes(projects, 'project-two', 'motion')).toEqual([
      0, 2,
    ])
    expect(getInitialSlideIndexes(projects, 'missing', 'motion')).toEqual([
      0, 0,
    ])
  })

  it('preserves special text-slide and media-key rules', () => {
    const aboutMeSlide = getProjectSlides(projects[0])[1]
    const screenshotSlide = getProjectSlides(projects[1])[1]

    expect(isAboutMeTextSlide(projects[0], aboutMeSlide)).toBe(true)
    expect(isModalScreenshotSlide(projects[0], aboutMeSlide)).toBe(false)
    expect(getProjectMediaScreenshots(projects[0])).toEqual([])
    expect(getSlideMediaKey(projects[0], aboutMeSlide, false)).toBeUndefined()
    expect(getSlideMediaKey(projects[1], screenshotSlide, false)).toBe(
      'carousel:overview',
    )
    expect(carouselMediaKey(projects[1].screenshots[0])).toBe(
      'carousel:overview',
    )
    expect(modalMediaKey(projects[1].screenshots[0])).toBe('modal:overview')
    expect(isVideoScreenshot(projects[1].screenshots[1])).toBe(true)
  })

  it('loops vertical selections through the start screen', () => {
    expect(getVerticalTargetProjectIndex(-1, -1, 2)).toBe(1)
    expect(getVerticalTargetProjectIndex(1, 1, 2)).toBe(-1)
  })
})

describe('portfolio routes', () => {
  const slidesBySlug = getProjectSlidesBySlug(projects)

  it('parses start, project, screenshot, and modal routes', () => {
    expect(parsePortfolioRoute('/work', '', projects, slidesBySlug)).toEqual({
      projectIndex: -1,
      slideIndex: 0,
      modalOpen: false,
    })
    expect(
      parsePortfolioRoute(
        '/work/project-two/overview',
        '?modal=image',
        projects,
        slidesBySlug,
      ),
    ).toEqual({ projectIndex: 1, slideIndex: 1, modalOpen: true })
    expect(
      parsePortfolioRoute(
        '/work/about-me/overview',
        '?modal=image',
        projects,
        slidesBySlug,
      ),
    ).toEqual({ projectIndex: 0, slideIndex: 1, modalOpen: false })
  })

  it('rejects unknown or overlong routes', () => {
    expect(parsePortfolioRoute('/about', '', projects, slidesBySlug)).toBeNull()
    expect(
      parsePortfolioRoute('/work/missing', '', projects, slidesBySlug),
    ).toBeNull()
    expect(
      parsePortfolioRoute(
        '/work/project-two/overview/extra',
        '',
        projects,
        slidesBySlug,
      ),
    ).toBeNull()
  })

  it('serializes URLs, document titles, and navigation labels', () => {
    const description = slidesBySlug['project-two'][0]
    const overview = slidesBySlug['project-two'][1]
    const motion = slidesBySlug['project-two'][2]

    expect(projectUrl(projects[1], description)).toBe('/work/project-two')
    expect(projectUrl(projects[1], overview)).toBe('/work/project-two/overview')
    expect(pageTitle()).toBe('Work | Aaron M. Wright')
    expect(pageTitle(projects[1], motion)).toBe(
      'Project Two: motion | Aaron M. Wright',
    )
    expect(slideNavigationTitle(projects[1], description)).toBe(
      'Project Two • Index',
    )
    expect(slideNavigationTitle(projects[1], overview)).toBe(
      '1 of 2 • Project Two • Overview',
    )
    expect(slideNavigationTitle(projects[1], motion)).toBe(
      '2 of 2 • Project Two • Motion',
    )
  })
})

describe('portfolio theme colors', () => {
  it('starts evenly spaced and corrects only colors below AA contrast', () => {
    expect(buildProjectColors(5)).toEqual([
      'hsl(342 78% 54%)',
      'hsl(54 78% 54%)',
      'hsl(126 78% 54%)',
      'hsl(198 78% 54%)',
      'hsl(270 78% 60.02%)',
    ])
    expect(getContrastAgainstBlack(270, 78, 60.02)).toBeGreaterThanOrEqual(4.5)
    expect(getProjectColor(['red', 'blue'], -1)).toBe('blue')
  })

  it('still produces one color when the project collection is empty', () => {
    expect(buildProjectColors(0)).toHaveLength(1)
  })

  it('derives near-white active colors without changing hue or saturation', () => {
    expect(buildActiveProjectColors(5)).toEqual([
      'hsl(342 78% 95%)',
      'hsl(54 78% 95%)',
      'hsl(126 78% 95%)',
      'hsl(198 78% 95%)',
      'hsl(270 78% 95%)',
    ])

    for (const hue of [342, 54, 126, 198, 270]) {
      expect(getContrastAgainstBlack(hue, 78, 95)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('derives near-white active colors from temporary hex overrides', () => {
    expect(buildActiveProjectColorFromHex('#7d45e4')).toBe(
      'hsl(261.13 74.65% 95%)',
    )
  })
})

describe('carousel geometry', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('builds canonical and looping entries without changing item identity', () => {
    expect(getCanonicalCarouselEntries(items).map(({ key }) => key)).toEqual([
      'real:a',
      'real:b',
      'real:c',
    ])
    expect(getLoopingCarouselEntries(items).map(({ key }) => key)).toEqual([
      'clone-before:c',
      'real:a',
      'real:b',
      'real:c',
      'clone-after:a',
    ])
    expect(getLoopingCarouselEntries([items[0]])).toHaveLength(1)
    expect(getLoopingCarouselEntries([items[0]], true)).toHaveLength(3)
  })

  it('calculates positions, rendered indexes, boundaries, and timing', () => {
    expect(positiveModulo(-1, 3)).toBe(2)
    expect(getFractionalCarouselPosition(450, 150, 200)).toBe(1.5)
    expect(getCanonicalRenderedCarouselIndex(2, 3)).toBe(3)
    expect(getCanonicalRenderedCarouselIndex(0, 1)).toBe(0)
    expect(isCarouselBoundaryJump(2, 0, 3)).toBe(true)
    expect(isCarouselBoundaryJump(0, 1, 2)).toBe(true)
    expect(isCarouselBoundaryJump(0, 1, 3)).toBe(false)
    expect(getNavigationTravelDuration(1)).toBeCloseTo(0.56)
    expect(getNavigationTravelDuration(20)).toBe(0.85)
  })
})
