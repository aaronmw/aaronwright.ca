import type {
  MosaicSegment,
  MosaicMedia,
  MosaicProject,
} from '@/components/mosaic/types'
import { DEFAULT_MOSAIC_ZOOM } from '@/components/mosaic/composition'
import {
  getProjectMediaScreenshots,
  isVideoScreenshot,
} from '@/components/portfolio/domain/slides'
import { portfolioSlides, type PortfolioScreenshot } from './portfolio'
import { aboutPortrait } from './aboutPortrait'
import { mosaicAboutCopy } from './mosaicAboutCopy'

// Measured from the original local assets with ffprobe; never infer their aspect ratio.
const mediaDimensions: Record<string, { width: number; height: number }> = {
  '/portfolio/loopio-case-study/dashboard.png': { width: 1332, height: 2335 },
  '/portfolio/loopio-case-study/old-app-remake.png': {
    width: 1280,
    height: 848,
  },
  '/portfolio/loopio-case-study/project workspace.png': {
    width: 1280,
    height: 976,
  },
  '/portfolio/loopio-case-study/loopui-documentation-platform.png': {
    width: 2560,
    height: 1800,
  },
  '/portfolio/mosaic/loopio-before-after.mp4': {
    width: 1920,
    height: 1080,
  },
  '/portfolio/freshbooks-case-study/redesigned-creation-screen.png': {
    width: 1220,
    height: 1421,
  },
  '/portfolio/mosaic/freshbooks-before-after.mp4': {
    width: 1920,
    height: 1080,
  },
  '/portfolio/freshbooks-case-study/classic-ui.png': {
    width: 2400,
    height: 1348,
  },
  '/portfolio/freshbooks-case-study/modern-ui.png': {
    width: 3098,
    height: 2348,
  },
  '/portfolio/freshbooks-case-study/sketch-design-system-library.png': {
    width: 1600,
    height: 900,
  },
  '/portfolio/mosaic/aarons-toolbox-demo.mp4': {
    width: 1920,
    height: 1080,
  },
  '/portfolio/aarons-toolbox/store-images--normalizer.png': {
    width: 1920,
    height: 1080,
  },
  '/portfolio/aarons-toolbox/store-images--randomizer.png': {
    width: 1920,
    height: 1080,
  },
  '/portfolio/aarons-toolbox/store-images--componentizer.png': {
    width: 1920,
    height: 1080,
  },
  '/portfolio/aarons-toolbox/store-images--distributor.png': {
    width: 1920,
    height: 1080,
  },
  '/portfolio/aarons-toolbox/store-images--selection-saver.png': {
    width: 1920,
    height: 1080,
  },
  '/portfolio/mosaic/informal-systems-walkthrough.mp4': {
    width: 1920,
    height: 1080,
  },
  '/portfolio/nextphrase-dot-app/intro-video.webm': {
    width: 530,
    height: 1080,
  },
}

// Lossless stills: Loopio, FreshBooks, Toolbox and Informal 0.5s, NextPhrase 12.5s.
const posters: Record<string, string> = {
  'loopio-before-after': '/portfolio/mosaic/loopio-before-after-poster.webp',
  'freshbooks-before-after':
    '/portfolio/mosaic/freshbooks-before-after-poster.webp',
  'aarons-toolbox-overview':
    '/portfolio/mosaic/aarons-toolbox-demo-poster.webp',
  'informal-systems-walkthrough':
    '/portfolio/informal-systems/walkthrough-poster.webp',
  'nextphrase-intro': '/portfolio/nextphrase-dot-app/poster.png',
}

const projectSummaries: Record<string, string> = {
  'about-me': 'I design and build interfaces to empower and delight humans.',
  'loopio':
    'A product redesign and shared component system for teams responding to proposals.',
  'freshbooks':
    'I contributed many of the foundational principles and patterns of the New FreshBooks.',
  'aarons-toolbox':
    'My personal toolbox of Figma plugins to help speed up the more tedious parts of design. ',
  'informal-systems':
    'I built a small network of Contentful-powered websites for Informal Systems.',
  'nextphrase-dot-app':
    "A game I've built at least five times now, each to learn some new platform or tech.",
}

const projectLongSummaries: Record<string, string> = {
  'freshbooks':
    "The FreshBooks redesign was a years-long process, starting with deep user research, then ideation, then lots of prototyping and user testing, then more research to validate our direction, then more research and prototyping to make sure users could switch (and switch back) confidently without disrupting their businesses. The new FreshBooks UI fundamentally simplified the experience for millions of active users. It's largely the same app today.",
  'loopio':
    "The Loopio product was in dire need of a re-imagining as its founder-built prototype was starting to show its age and limitations as the company pitched larger and larger organizations. I partnered with Thomas Cheng to re-imagine the product with all we'd learned from years of customer feedback and internal conversations, and we built a prototype that was so well-received, the entire org pivoted to get it production-ready and in the hands of begging customers. Then, I owned the building and socialization of the design system and its rich documentation with examples and live code snippets to help developers ramp-up to the new architecture.",
  'aarons-toolbox':
    "I've built a handful of FIgma plugins over the years, some with tens of thousands of users. Figma's been my design tool of choice since its beta days, and it's been really satisfying to share my tools with the community of other designers to help others save time and avoid tedium, too.",
  'informal-systems':
    'I built numerous web properties for Informal Systems and a number of its internal project teams. All of them consumed the Contentful API, upon which I built a hover-to-edit workflow to enable non-developers across the organization to maintain the content while I retained control over presentation.',
  'nextphrase-dot-app':
    'I’ve built this game at least five times now. I’ve built it with different themes, different mechanics, and on different technologies. Now it’s just a simple PWA because it’s the most accessible: just visit [NextPhrase.app](https://nextphrase.app) and add it to your home screen for the best experience.',
}

const projectUrls: Record<string, string> = {
  loopio: 'https://loopio.com',
  freshbooks: 'https://www.freshbooks.com',
  'informal-systems': 'https://staging.informal.systems',
}

// Source focal points and composition targets are separate, editable coordinates.
// Keying by media ID prevents a replacement first slide inheriting an unrelated crop.
// Video cells may set ordered segments with independent fades. Omission uses the full video.
const firstMediaComposition: Record<
  string,
  MosaicProject['composition'] & { segments?: MosaicSegment[] }
> = {
  'about-portrait': {
    focal: { x: 0.5, y: 0.5 },
    target: { x: 0.5, y: 0.5 },
    zoom: 1,
  },
  'loopio-before-after': {
    focal: { x: 0.5, y: 0.5 },
    target: { x: 0.5, y: 0.5 },
    zoom: 1,
    segments: [
      {
        id: 'df90c05c-745c-4056-ad51-f12f5f5c448a',
        start: 0,
        end: 0.9009,
        fadeIn: true,
        fadeInColor: 'white',
        fadeOut: false,
        speed: 1,
      },
      {
        id: 'full-video',
        start: 0.9009,
        end: 4.170833,
        fadeIn: false,
        fadeOut: true,
        fadeOutColor: 'white',
        speed: 2,
      },
    ],
  },
  'freshbooks-before-after': {
    focal: { x: 0.5, y: 0.5 },
    target: { x: 0.5, y: 0.5 },
    zoom: 1,
    segments: [
      {
        id: '4afcd9cb-7ab5-44e1-bec4-58bcbdd6a46f',
        start: 0,
        end: 0.967633,
        fadeIn: true,
        fadeInColor: 'white',
        fadeOut: false,
        speed: 1,
        composition: {
          focal: { x: 0.5121511436334014, y: 0.5125299763200271 },
          target: { x: 0.5, y: 0.5 },
          zoom: 1.923218337109468,
        },
      },
      {
        id: 'freshbooks-before-after-segment-1',
        start: 0.967633,
        end: 12.228883,
        fadeIn: false,
        fadeOut: true,
        fadeOutColor: 'white',
        speed: 2,
        composition: {
          focal: { x: 0.4988938684025177, y: 0.2599808822286309 },
          target: { x: 0.5, y: 0.5 },
          zoom: 1.923218337109468,
        },
      },
    ],
  },
  'informal-systems-walkthrough': {
    focal: { x: 0.5, y: 0.5 },
    target: { x: 0.5, y: 0.5 },
    zoom: 1,
    segments: [
      {
        id: 'informal-systems-walkthrough-segment-1',
        start: 0,
        end: 21.905217,
        fadeIn: false,
        fadeOut: false,
        composition: {
          focal: { x: 0.5000018794731461, y: 0.5 },
          target: { x: 0.5, y: 0.5 },
          zoom: 1,
        },
        speed: 3,
      },
    ],
  },
  'aarons-toolbox-overview': {
    focal: { x: 0.8376783392368743, y: 0.37840649240012547 },
    target: { x: 1 / 3, y: 1 / 3 },
    zoom: DEFAULT_MOSAIC_ZOOM,
    segments: [
      {
        id: 'full-video',
        start: 0.5,
        end: 1.75,
        fadeIn: false,
        fadeOut: false,
        composition: {
          focal: { x: 0.33334235306851384, y: 0.3333333333333333 },
          target: { x: 1 / 3, y: 1 / 3 },
          zoom: 1,
        },
      },
    ],
  },
  'nextphrase-intro': {
    focal: { x: 0.5704938101780288, y: 0.2854641964592395 },
    target: { x: 2 / 3, y: 1 / 3 },
    zoom: 2.449784349327658,
    segments: [
      {
        id: 'full-video',
        start: 0,
        end: 4.5,
        fadeIn: false,
        fadeOut: true,
        speed: 1,
        composition: {
          focal: { x: 0.6666792076600387, y: 1 / 3 },
          target: { x: 2 / 3, y: 1 / 3 },
          zoom: 1,
        },
      },
    ],
  },
}

const aboutFallback: PortfolioScreenshot = {
  id: 'about-portrait',
  slug: 'portrait',
  src: aboutPortrait.src,
  width: aboutPortrait.width,
  height: aboutPortrait.height,
  alt: aboutPortrait.alt,
}

function toMosaicMedia(screenshot: PortfolioScreenshot): MosaicMedia {
  // These new demos belong to the grid; preserve the legacy portfolio's media.
  if (screenshot.id === 'loopio-cover')
    screenshot = {
      ...screenshot,
      id: 'loopio-before-after',
      src: '/portfolio/mosaic/loopio-before-after.mp4',
      alt: 'Loopio project workspace transitioning from the Classic interface to the redesigned interface',
    }
  if (screenshot.id === 'freshbooks-cover')
    screenshot = {
      ...screenshot,
      id: 'freshbooks-before-after',
      src: '/portfolio/mosaic/freshbooks-before-after.mp4',
      alt: 'FreshBooks invoice creation transitioning from the Classic interface to the redesigned editor',
    }
  if (screenshot.id === 'aarons-toolbox-overview')
    screenshot = {
      ...screenshot,
      src: '/portfolio/mosaic/aarons-toolbox-demo.mp4',
    }
  if (screenshot.id === 'informal-systems-walkthrough')
    screenshot = {
      ...screenshot,
      src: '/portfolio/mosaic/informal-systems-walkthrough.mp4',
      clip: undefined,
    }
  if (screenshot.id === 'nextphrase-intro')
    screenshot = {
      ...screenshot,
      src: '/portfolio/nextphrase-dot-app/intro-video.webm',
    }
  const dimensions =
    mediaDimensions[screenshot.src] ??
    (screenshot.width && screenshot.height
      ? { width: screenshot.width, height: screenshot.height }
      : undefined)
  if (!dimensions)
    throw new Error(`Missing mosaic media dimensions: ${screenshot.src}`)

  return {
    id: screenshot.id,
    slug: screenshot.slug,
    src: screenshot.src,
    alt: screenshot.alt,
    clip: screenshot.clip,
    ...dimensions,
    video: isVideoScreenshot(screenshot),
    ...(posters[screenshot.id] ? { poster: posters[screenshot.id] } : {}),
  }
}

// Grid-only work: keep the legacy portfolio collection unchanged.
const cyclesProject: MosaicProject = {
  id: 'cycles-dot-money',
  slug: 'cycles-dot-money',
  title: 'Cycles',
  url: 'https://cycles.money',
  summary:
    "I worked with Informal's marketing designer to bring this site's scroll-driven animation to life.",
  longSummary:
    'The first major challenge we had marketing Cycles was helping people understand what it even is. I suggested we tell a story with scroll-driven animations to guide users through the history of the problem, how it manifests today, and where our solution comes in.',
  media: [
    {
      id: 'cycles-scrollthrough',
      slug: 'scrollthrough',
      src: '/portfolio/cycles-dot-money/scrollthrough.mp4',
      poster: '/portfolio/cycles-dot-money/poster.png',
      alt: 'Cycles website scrollthrough showing its animated illustrations and interactions',
      width: 1920,
      height: 1080,
      video: true,
      segments: [
        {
          id: 'cycles-scrollthrough-segment-1',
          start: 2.99,
          end: 35.41,
          fadeIn: true,
          fadeOut: true,
          speed: 5,
        },
      ],
    },
  ],
  composition: {
    focal: { x: 0.333328823465743, y: 0.3333333333333333 },
    target: { x: 1 / 3, y: 1 / 3 },
    zoom: 1,
  },
}

const ageProject: MosaicProject = {
  id: 'age-dot-fund',
  slug: 'age-dot-fund',
  title: 'AGE',
  url: 'https://age.fund',
  summary:
    'I designed and built the AGE.fund website alongside the founders to communicate their unique value.',
  longSummary:
    'The AGE.fund founders approached me with a freelance opportunity to help them communicate and present the unique value of their new digital-asset-specific fund.',
  media: [
    {
      id: 'age-scrollthrough',
      slug: 'scrollthrough',
      src: '/portfolio/age-dot-fund/scrollthrough.mp4',
      poster: '/portfolio/age-dot-fund/poster.webp',
      alt: 'AGE fund website scrollthrough',
      width: 1920,
      height: 1080,
      video: true,
      segments: [
        {
          id: 'full-video',
          start: 0,
          end: 9.125783,
          fadeIn: true,
          fadeOut: true,
          fadeInColor: 'white',
          fadeOutColor: 'white',
          speed: 3,
          composition: {
            focal: { x: 0.5, y: 0.4999848672860991 },
            target: { x: 0.5, y: 0.5 },
            zoom: 1,
          },
        },
      ],
    },
  ],
  composition: {
    focal: { x: 0.5, y: 0.5 },
    target: { x: 0.5, y: 0.5 },
    zoom: 1,
  },
}

const radioProject: MosaicProject = {
  id: 'radio-app',
  slug: 'radio-app',
  title: 'Radio App',
  url: 'https://old-timey-radio-app.netlify.app',
  summary: 'The radio in my car sounded terrible, so I made my own.',
  longSummary:
    'Turns out, radio stations all publish their own streams. And there are free catalogues of those streams. I only wanted local stations, so my radio app geo-locates the user first then loads local stations in the background. Also features a simulated LCD screen with slow-dimming pixels, because why not?',
  media: [
    {
      id: 'radio-app-demo',
      slug: 'demo',
      src: '/portfolio/radio-app/demo.mp4',
      poster: '/portfolio/radio-app/poster.webp',
      alt: 'Radio App demo showing a gold radio interface and its tuning controls',
      width: 1920,
      height: 1080,
      video: true,
      segments: [
        {
          id: 'radio-app-intro',
          start: 0,
          end: 0.967633,
          fadeIn: true,
          fadeOut: false,
          speed: 1,
        },
        {
          id: 'radio-app-walkthrough',
          start: 10.51,
          end: 17.63,
          fadeIn: true,
          fadeOut: true,
          speed: 2,
          fadeInColor: 'black',
        },
        {
          id: '7b2e34a8-a416-4e3d-b454-5b4acce15ee7',
          start: 58.26,
          end: 61.027632999999994,
          fadeIn: true,
          fadeOut: true,
          speed: 2,
          fadeOutColor: 'black',
          fadeInColor: 'black',
        },
      ],
    },
  ],
  composition: {
    focal: { x: 0.5, y: 0.5 },
    target: { x: 0.5, y: 0.5 },
    zoom: 1,
  },
}

const giftExchangesProject: MosaicProject = {
  id: 'gift-exchanges',
  slug: 'gift-exchanges',
  title: 'Gift Exchanges',
  url: 'https://gift-exchange-parties.netlify.app',
  summary: 'I built my own "Secret Santa" app to scratch my own itch.',
  longSummary:
    'Every year, both my family and close circle of friends organize a "Secret Santa" gift exchange, and every year we were forced to use less-than-great solutions. So this year, I built my own. It\'s powered by Supabase Realtime connections and authentication, and allows us to build and share wish lists, sends multi-channel notifications for updates and reminders, and more.',
  media: [
    {
      id: 'gift-exchanges-demo',
      slug: 'demo',
      src: '/portfolio/gift-exchanges/demo.mp4',
      poster: '/portfolio/gift-exchanges/poster.webp',
      alt: 'Gift Exchanges demo showing gift exchange parties and their settings',
      width: 1920,
      height: 1080,
      video: true,
      segments: [
        {
          id: 'full-video',
          start: 1.16,
          end: 8.89,
          fadeIn: true,
          fadeOut: true,
          fadeOutColor: 'black',
          fadeInColor: 'black',
        },
      ],
    },
  ],
  composition: {
    focal: { x: 0.5, y: 0.5 },
    target: { x: 0.5, y: 0.5 },
    zoom: 1,
  },
}

export const mosaicProjects: MosaicProject[] = portfolioSlides
  .map(project => {
    const slug =
      project.slug === 'nextphrase' ? 'nextphrase-dot-app' : project.slug
    const screenshots = getProjectMediaScreenshots(project)
    const media = (
      project.id === 'about-me' && screenshots.length === 0
        ? [aboutFallback]
        : screenshots
    )
      .slice(0, 1)
      .map(toMosaicMedia)
    const { segments, ...composition } = firstMediaComposition[
      media[0]?.id
    ] ?? {
      focal: { x: 0.5, y: 0.5 },
      target: { x: 1 / 3, y: 1 / 3 },
      zoom: DEFAULT_MOSAIC_ZOOM,
    }

    return {
      id: slug,
      slug,
      title: project.title,
      url: project.url ?? projectUrls[slug],
      summary: projectSummaries[slug],
      longSummary: projectLongSummaries[slug],
      ...(project.slug === 'about-me'
        ? {
            about: { ...mosaicAboutCopy },
          }
        : {}),
      media:
        segments && media[0]?.video
          ? [
              {
                ...media[0],
                segments: segments.map(segment => ({ ...segment })),
              },
            ]
          : media,
      composition,
    }
  })
  .flatMap(project =>
    project.slug === 'informal-systems' ? [cyclesProject, project] : [project],
  )
  .concat(ageProject, radioProject, giftExchangesProject)
