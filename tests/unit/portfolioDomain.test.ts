import { describe, expect, it } from 'vitest'
import { portfolioSlides, type PortfolioProject } from '../../lib/portfolio'
import { positiveModulo } from '../../components/portfolio/domain/carousel'
import {
  pageTitle,
  parsePortfolioRoute,
  projectUrl,
  slideNavigationTitle,
  viewerUrl,
} from '../../components/portfolio/domain/routing'
import {
  carouselMediaKey,
  getInitialSlideIndexes,
  getProjectMediaScreenshots,
  getProjectSlides,
  getProjectSlidesBySlug,
  getSlideMediaKey,
  getVerticalTargetProjectIndex,
  isViewerScreenshotSlide,
  isVideoScreenshot,
  viewerMediaKey,
} from '../../components/portfolio/domain/slides'
import { getProjectNarratives } from '../../components/portfolio/domain/narrative'
import {
  getPortfolioViewerSlides,
  getViewerMediaTransform,
  getViewerSlideIndex,
} from '../../components/portfolio/domain/viewer'
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
    overviewMarkdown: '',
    screenshots: [],
  },
  {
    id: 'project-two',
    slug: 'project-two',
    title: 'Project Two',
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
    expect(portfolioSlides.map((project) => project.slug)).toEqual([
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
    expect(getInitialSlideIndexes(projects, 'project-two', 'motion')).toEqual([
      0, 1,
    ])
    expect(getInitialSlideIndexes(projects, 'missing', 'motion')).toEqual([
      0, 0,
    ])
  })

  it('uses one description slide only for a media-free project', () => {
    const aboutMeSlides = getProjectSlides(projects[0])
    const aboutMeSlide = aboutMeSlides[0]
    const screenshotSlide = getProjectSlides(projects[1])[0]

    expect(aboutMeSlides).toHaveLength(1)
    expect(aboutMeSlide.kind).toBe('description')
    expect(isViewerScreenshotSlide(projects[0], aboutMeSlide)).toBe(false)
    expect(getProjectMediaScreenshots(projects[0])).toEqual([])
    expect(getSlideMediaKey(projects[0], aboutMeSlide, false)).toBeUndefined()
    expect(getSlideMediaKey(projects[1], screenshotSlide, false)).toBe(
      'carousel:overview',
    )
    expect(carouselMediaKey(projects[1].screenshots[0])).toBe(
      'carousel:overview',
    )
    expect(viewerMediaKey(projects[1].screenshots[0])).toBe('modal:overview')
    expect(isVideoScreenshot(projects[1].screenshots[1])).toBe(true)
  })

  it('loops vertical selections through the start screen', () => {
    expect(getVerticalTargetProjectIndex(-1, -1, 2)).toBe(1)
    expect(getVerticalTargetProjectIndex(1, 1, 2)).toBe(-1)
  })
})

describe('portfolio routes', () => {
  const slidesBySlug = getProjectSlidesBySlug(projects)

  it('parses start, project, screenshot, and legacy viewer routes', () => {
    expect(parsePortfolioRoute('/work', '', projects, slidesBySlug)).toEqual({
      projectIndex: -1,
      slideIndex: 0,
      viewerOpen: false,
    })
    expect(
      parsePortfolioRoute(
        '/work/project-two/overview',
        '?modal=image',
        projects,
        slidesBySlug,
      ),
    ).toEqual({ projectIndex: 1, slideIndex: 0, viewerOpen: true })
    expect(
      parsePortfolioRoute(
        '/work/project-two/motion',
        '?zoom=image',
        projects,
        slidesBySlug,
      ),
    ).toEqual({ projectIndex: 1, slideIndex: 1, viewerOpen: true })
    expect(
      parsePortfolioRoute(
        '/work/about-me/overview',
        '?modal=image',
        projects,
        slidesBySlug,
      ),
    ).toBeNull()
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

  it('round-trips the About Me text panels without treating them as viewer media', () => {
    const about = portfolioSlides.find(project => project.slug === 'about-me')!
    const slides = getProjectSlides(about)
    const projectSlides = getProjectSlidesBySlug([about])

    expect(slides.map(slide => slide.kind)).toEqual(['description', 'details'])
    expect(projectUrl(about, slides[0])).toBe('/work/about-me')
    expect(projectUrl(about, slides[1])).toBe('/work/about-me/details')
    expect(getInitialSlideIndexes([about], 'about-me', 'details')).toEqual([1])
    slides.forEach((slide, index) => {
      expect(parsePortfolioRoute(
        projectUrl(about, slide), '?modal=image', [about], projectSlides,
      )).toEqual({
        projectIndex: 0,
        slideIndex: index,
        viewerOpen: false,
      })
      expect(isViewerScreenshotSlide(about, slide)).toBe(false)
      expect(getSlideMediaKey(about, slide, true)).toBeUndefined()
    })
    expect(getPortfolioViewerSlides(about)).toEqual([])
    expect(pageTitle(about, slides[1])).toBe(
      'About Me: details | Aaron M. Wright',
    )
    expect(slideNavigationTitle(about, slides[1])).toBe('About Me • Details')
  })

  it('serializes URLs, document titles, and navigation labels', () => {
    const overview = slidesBySlug['project-two'][0]
    const motion = slidesBySlug['project-two'][1]

    expect(projectUrl(projects[1], overview)).toBe('/work/project-two')
    expect(projectUrl(projects[0], slidesBySlug['about-me'][0])).toBe(
      '/work/about-me',
    )
    expect(viewerUrl(projects[1], overview)).toBe(
      '/work/project-two/overview?modal=image',
    )
    expect(pageTitle()).toBe('Work | Aaron M. Wright')
    expect(pageTitle(projects[1], motion)).toBe(
      'Project Two: motion | Aaron M. Wright',
    )
    expect(slideNavigationTitle(projects[1], overview)).toBe(
      'Project Two • Index',
    )
    expect(slideNavigationTitle(projects[1], motion)).toBe(
      '2 of 2 • Project Two • Motion',
    )
  })
})

describe('project narrative resolution', () => {
  const project: PortfolioProject = {
    id: 'notes',
    slug: 'notes',
    title: 'Notes',
    blurb: '',
    overviewMarkdown: '# Project headline\n\nProject introduction',
    screenshots: [
      { id: 'one', slug: 'one', src: '/one.png', alt: 'One' },
      {
        id: 'two',
        slug: 'two',
        src: '/two.png',
        alt: 'Two',
        description: '## Slide two\n\nSpecific notes',
      },
      { id: 'three', slug: 'three', src: '/three.png', alt: 'Three' },
    ],
  }

  it('uses the project intro until a slide supplies notes, then inherits those notes without wrapping', () => {
    const narratives = getProjectNarratives(project, getProjectSlides(project))
    expect(narratives).toEqual([
      {
        sourceId: 'project:notes',
        titleMarkdown: 'Project headline',
        bodyMarkdown: 'Project introduction',
      },
      {
        sourceId: 'slide:two',
        titleMarkdown: 'Slide two',
        bodyMarkdown: 'Specific notes',
      },
      {
        sourceId: 'slide:two',
        titleMarkdown: 'Slide two',
        bodyMarkdown: 'Specific notes',
      },
    ])
  })

  it('keeps the biography separate and preserves all supporting section headings', () => {
    const textProject: PortfolioProject = {
      ...projects[0],
      overviewMarkdown: 'Biography paragraph.',
      detailsMarkdown: '## Situations\n\n- One\n\n## Collaboration\n\n- Two\n\n## Contributions\n\n- Three',
    }
    expect(getProjectNarratives(textProject, getProjectSlides(textProject))).toEqual([
      { sourceId: 'project:about-me', bodyMarkdown: 'Biography paragraph.' },
      { sourceId: 'slide:about-me-details', bodyMarkdown: textProject.detailsMarkdown },
    ])
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

describe('carousel selection', () => {
  it('wraps forward and backward without clone indexes', () => {
    expect(positiveModulo(-1, 3)).toBe(2)
    expect(positiveModulo(3, 3)).toBe(0)
  })
})

describe('portfolio viewer media', () => {
  it('filters text slides and keeps public media in canonical order', () => {
    expect(getPortfolioViewerSlides(projects[0])).toEqual([])
    const viewerSlides = getPortfolioViewerSlides(projects[1])
    expect(viewerSlides.map((slide) => slide.id)).toEqual([
      'overview',
      'motion',
    ])
    expect(getViewerSlideIndex(viewerSlides, 'motion')).toBe(1)
    expect(getViewerSlideIndex(viewerSlides, 'missing')).toBe(0)
  })

  it('includes a cover before project screenshots', () => {
    const project = {
      ...projects[1],
      cover_image: {
        id: 'cover',
        slug: 'cover',
        src: '/cover.png',
        alt: 'Cover',
      },
    }
    expect(getPortfolioViewerSlides(project).map((slide) => slide.id)).toEqual([
      'cover',
      'overview',
      'motion',
    ])
  })
})

describe('viewer transition geometry', () => {
  it('fits the source image inside the expanded frame without changing its aspect ratio', () => {
    expect(
      getViewerMediaTransform(
        { left: 100, top: 80, width: 300, height: 200 },
        { left: 400, top: 40, width: 900, height: 600 },
      ),
    ).toEqual({ x: -300, y: 40, scale: 1 / 3 })
  })

  it('returns to the same source when an opening transform is interrupted', () => {
    const target = { left: 100, top: 80, width: 300, height: 200 }
    const resting = { left: 400, top: 40, width: 900, height: 600 }
    const current = { x: -150, y: 20, scale: 2 / 3 }
    const interrupted = { left: 250, top: 60, width: 600, height: 400 }
    expect(getViewerMediaTransform(target, interrupted, current)).toEqual(
      getViewerMediaTransform(target, resting),
    )
  })
})
