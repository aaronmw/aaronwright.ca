export type PortfolioScreenshot = {
  id: string
  slug: string
  src: string
  alt: string
  description?: string
  animated?: boolean
  clipToPhoneFrame?: boolean
  restartable?: boolean
}

export type PortfolioProject = {
  id: string
  slug: string
  title: string
  blurb: string
  url?: string
  overviewMarkdown: string
  detailsMarkdown?: string
  rolesMarkdown?: string
  dates?: string
  cover_image?: PortfolioScreenshot
  screenshots: PortfolioScreenshot[]
}

const MARKDOWN_ACRONYMS = {
  AI: 'Artificial Intelligence',
  CMS: 'Content Management System',
  PWA: 'Progressive Web App',
  UI: 'User Interface',
  UX: 'User Experience',
} as const

const MARKDOWN_ACRONYM_PATTERN = new RegExp(
  `(^|[^A-Za-z0-9])(${Object.keys(MARKDOWN_ACRONYMS).join('|')})(?=$|[^A-Za-z0-9])`,
  'g',
)
const MARKDOWN_SKIP_PATTERN =
  /(```[\s\S]*?```|`[^`\n]+`|!?\[[^\]]*]\([^)]*\)|<[^>]+>)/g
const MARKDOWN_FENCE_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g
const MARKDOWN_BLOCK_SEPARATOR_PATTERN = /(\n\s*\n)/g
const MARKDOWN_STANDALONE_LINE_PATTERN = /^\s*(?:(?:[-+*]|\d+[.)])\s+|>\s*)/

function escapeHtmlAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function transformMarkdownAcronyms(markdown: string) {
  return markdown
    .split(MARKDOWN_SKIP_PATTERN)
    .map((segment, index) => {
      if (index % 2 === 1) {
        return segment
      }

      return segment.replace(
        MARKDOWN_ACRONYM_PATTERN,
        (match, prefix: string, acronym: keyof typeof MARKDOWN_ACRONYMS) =>
          `${prefix}<abbr title="${escapeHtmlAttribute(
            MARKDOWN_ACRONYMS[acronym],
          )}">${acronym}</abbr>`,
      )
    })
    .join('')
}

function bindLastTwoTokens(value: string) {
  return value.replace(/(\S)[\t\r\n ]+(\S+)(\s*)$/, '$1&nbsp;$2$3')
}

function preventMarkdownOrphans(markdown: string) {
  return markdown
    .split(MARKDOWN_FENCE_PATTERN)
    .map((segment, fenceIndex) => {
      if (fenceIndex % 2 === 1) {
        return segment
      }

      return segment
        .split(MARKDOWN_BLOCK_SEPARATOR_PATTERN)
        .map(block => {
          if (!block.trim()) {
            return block
          }

          const lines = block.split('\n')
          const isStandaloneLineBlock = lines
            .filter(line => line.trim())
            .every(line => MARKDOWN_STANDALONE_LINE_PATTERN.test(line))

          return isStandaloneLineBlock
            ? lines.map(bindLastTwoTokens).join('\n')
            : bindLastTwoTokens(block)
        })
        .join('')
    })
    .join('')
}

function transformPortfolioMarkdown(markdown: string) {
  return transformMarkdownAcronyms(preventMarkdownOrphans(markdown))
}

function transformPortfolioProjectMarkdown(
  project: PortfolioProject,
): PortfolioProject {
  const transformScreenshotMarkdown = (
    screenshot: PortfolioScreenshot,
  ): PortfolioScreenshot => ({
    ...screenshot,
    description: screenshot.description
      ? transformPortfolioMarkdown(screenshot.description)
      : undefined,
  })

  return {
    ...project,
    blurb: transformPortfolioMarkdown(project.blurb),
    overviewMarkdown: transformPortfolioMarkdown(project.overviewMarkdown),
    detailsMarkdown: project.detailsMarkdown
      ? transformPortfolioMarkdown(project.detailsMarkdown)
      : undefined,
    rolesMarkdown: project.rolesMarkdown
      ? transformPortfolioMarkdown(project.rolesMarkdown)
      : undefined,
    cover_image: project.cover_image
      ? transformScreenshotMarkdown(project.cover_image)
      : undefined,
    screenshots: project.screenshots.map(transformScreenshotMarkdown),
  }
}

const LOOPIO_OVERVIEW = `
# A blank canvas re-imagining of Loopio's core offering

Loopio's core RFP workflow had outgrown the frontend beneath it. I partnered with Thomas Cheng to turn a redesign proposal into a working product, then carried that momentum into a tested, documented design system other teams could leverage and safely extend themselves.
`

const FRESHBOOKS_OVERVIEW = `
# Redesigning for Simplicity and Scale

I was selected to join a small group of FreshBookers tasked with reimagining the platform as a coherent system: clearer workflows, reusable interaction patterns, and a bidirectional transition path that let customers move to the new platform when they were ready and even move back if they later decided they weren't.
`

const rawPortfolioSlides = [
  {
    id: 'loopio',
    slug: 'loopio',
    title: 'Loopio',
    blurb:
      'I designed and prototyped a new Loopio experience that went on to replace the original product. Then I built, documented, and championed a shared system for teams to build upon.',
    overviewMarkdown: LOOPIO_OVERVIEW,
    rolesMarkdown: 'Principal Designer → Sr. UX Engineer',
    dates: '2018–2022',
    cover_image: {
      id: 'loopio-cover',
      slug: 'cover',
      src: '/portfolio/loopio-case-study/dashboard.png',
      alt: 'Loopio project workspace in the current product',
    },
    screenshots: [
      {
        id: 'loopio-legacy-workspace',
        slug: 'a-mature-product',
        src: '/portfolio/loopio-case-study/old-app-remake.png',
        alt: 'Loopio project workspace before the redesign',
        description: `
## The problem: the original prototype had overstayed its welcome

Loopio had found product-market fit, but its interface had accumulated several generations of frontend tech: jQuery, Backbone, React, Redux, Bootstrap, and one-off controls living side by side.

That inconsistency was expensive: designers and developers had to specialize in arbitrary "zones" and couldn't easily collaborate across those zones without onboarding. It was also hard to achieve consensus without a real “source of truth”.
`,
      },
      {
        id: 'loopio-dense-work',
        slug: 'dense-work',
        src: '/portfolio/loopio-case-study/project workspace.png',
        alt: 'Loopio project redesign with bulk assignment controls',
        description: `
## The solution: a prototype demonstrating Loopio’s potential

Thomas joined in August 2018 and felt the pain of working on the aging platform. Together, we ideated, prototyped, and iterated on a number of improvements to one of the platform’s core surfaces: the Project Workspace.

Decidedly the most complex UX in the product, we used it as a proving ground for how a purpose-built design system could make better use of precious screen real-estate, giving users more “questions per screen” while simultaneously surfacing features many users didn’t even know existed.
`,
      },
      {
        id: 'loopio-shared-system',
        slug: 'shared-system',
        src: '/portfolio/loopio-case-study/loopui-documentation-platform.png',
        alt: 'Recovered LoopUI Storybook documenting the Anchor component',
        description: `
## Principal hat: off. Developer hat: on.

The prototype received unanimous support from customers and our Sales team, which kicked everyone into high gear to convert the rest of the platform. A new problem surfaced: our team of engineers hadn’t yet mastered React or TypeScript and so couldn’t just immediately get working.

This is where I pivoted roles from leading the design of the system, to building, refining, and documenting the most commonly used and hard-to-build components so engineers had examples with live code snippets and supporting info like where and when to use which.

“Loopui” survives to this day, though by a new name, and on Storybook. My documentation platform is still live!
`,
      },
    ],
  },
  {
    id: 'freshbooks',
    slug: 'freshbooks',
    title: 'FreshBooks',
    blurb:
      'A ground-up product redesign shaped around approachable workflows, shared patterns, and a safer path through change.',
    overviewMarkdown: FRESHBOOKS_OVERVIEW,
    rolesMarkdown: 'UX Designer',
    dates: '2012–2018',
    cover_image: {
      id: 'freshbooks-cover',
      slug: 'cover',
      src: '/portfolio/freshbooks-case-study/redesigned-creation-screen.png',
      alt: 'The current FreshBooks invoice editor',
    },
    screenshots: [
      {
        id: 'freshbooks-early-client-overview',
        slug: 'client-first',
        src: '/portfolio/freshbooks-case-study/classic-ui.png',
        alt: 'An early FreshBooks redesign exploration organized around clients',
        description: `
## The Problem: A collection of disparate tools is not a platform

The FreshBooks application had aged but was still very much loved by our customers. Users weren’t suddenly experiencing major pains, but we — the teams building the product for more and more robust accounting — kept running into challenges extending systems that weren’t actually there.

Furthermore, the web had matured in a big way with “Web 2.0” showing users that web apps can feel like apps and not websites, but ours was more “website” than “app” with every click requiring a full reload and context reset.
`,
      },
      {
        id: 'freshbooks-early-client-activity',
        slug: 'one-system',
        src: '/portfolio/freshbooks-case-study/modern-ui.png',
        alt: 'An early FreshBooks redesign exploration combining client activity',
        description: `
## The solution: a platform of tools that share context and work together

I helped design and systematize the new FreshBooks, contributing ideas that became app-wide patterns that boosted engagement and helped users make sense of each tool’s role in their small business accounting.

The WYSIWYG entity-creation screens, for example, turned long and complex forms into simple, recognizable documents that simply required users to “fill in the blanks”.

I also contributed the “Meta Pane”: each entity had its own set of tools and related settings which, in the old world, cluttered the UI. The Meta Pane rolled that functionality into neat little self-summarizing drawers of functionality on the right side of every entity. Users were also able to more clearly see valuable features and functionality they might have missed in the old app.
`,
      },
      {
        id: 'freshbooks-shared-patterns',
        slug: 'shared-patterns',
        src: '/portfolio/freshbooks-case-study/sketch-design-system-library.png',
        alt: 'Current FreshBooks project creation flow using shared form and settings patterns',
        description: `
## Long-term support

With a design system in place, I set to work on building supporting materials to help the other designers easily build new screens “like LEGO”, using patterns and tokens encoded into the components themselves (I was using Sketch at the time).

I also led the writing and building of documentation so developers and designers had access to real, working examples of our components, from “atoms” to “organisms”, complete with guidance on when to use each and where to find good examples of them in the living product.
`,
      },
    ],
  },
  {
    id: 'about-me',
    slug: 'about-me',
    title: 'About Me',
    blurb:
      'Twenty-five years across **product design** and **frontend development**, now focused on helping other people do excellent work.',
    overviewMarkdown: `
I’m a product designer and frontend engineer with a particular fondness for fixing things people have learned to work around. Sometimes that means rethinking a complicated interface. Sometimes it means building a shared component or a tool that saves everyone a few hours.

I started building for the web in 1999, after discovering Microsoft FrontPage on the family computer. Within days, I’d published a homepage with all the requisite GIFs and marquees. Before long, I was building tools to do homework and trading websites for computer parts. I’m still motivated by that same satisfaction: making something useful, then watching someone use it.

At FreshBooks and Loopio, that curiosity grew into work on substantial product redesigns and the systems supporting them. At Loopio, I moved from designing and prototyping a new experience to building and documenting the React components other teams needed to extend it. I like being able to follow an idea through those different kinds of work.

Teaching has become another favourite part of what I do. I taught interaction design in the York/Sheridan and Sheridan design programs, and I’ve mentored designers and engineers throughout my career. I enjoy helping someone work through a difficult problem and come away better equipped for the next one.

These days, I’m especially interested in how better tools and practices can give teams more room to think. That includes finding useful applications for AI, alongside the scripts, plugins, and shared systems I’ve always enjoyed building. I care about raising the bar while making good work easier to do.
`,
    detailsMarkdown: `
## Situations I know well

- A successful product has outgrown the interface and frontend it started with.
- A redesign needs to improve familiar workflows without leaving existing customers behind.
- Different teams keep solving the same interface problems in different ways.
- Engineers are adopting unfamiliar tools while still being expected to deliver.
- Repetitive work has become so routine that people have stopped questioning it.

## What I’m like to work with

- I like making ideas tangible early, through sketches, prototypes, or working code.
- I’m comfortable moving between design critique and implementation details.
- I enjoy teaching through real problems and working examples.
- I notice everyday friction and tend to build something about it.
- I get a lot of satisfaction from making someone else’s work easier.

## Where I’m most useful

- Making complex product workflows clearer and easier to navigate.
- Turning a promising design direction into a working prototype people can evaluate.
- Building design systems with the components, documentation, and examples teams need to use them.
- Helping designers and engineers develop their judgment through critique and mentoring.
- Improving how a team works through practical tooling, automation, and AI.
`,
    screenshots: [],
  },
  {
    id: 'aarons-toolbox',
    slug: 'aarons-toolbox',
    title: "Aaron's Toolbox",
    blurb:
      'One **Figma plugin** with built-in tools for cleaning, remixing, and organizing design work.',
    url: 'https://www.figma.com/community/plugin/1616614645120502242/aarons-toolbox',
    overviewMarkdown: `
I'm infatuated with Figma both as a user and as a developer building on their platform. I'm equally obsessed with the art and science of tool-building, so the match is cosmically perfect.

**Aaron's Toolbox** is a collection of utilities I've built to solve problems I repeatedly encounter in my own design work. Some automate repetitive tasks, others simplify common workflows, and two are actually evolutions of plugins I'd already built and refined over years of use (both with [tens of thousands of users in the Figma Community](https://www.figma.com/@aaronmw)).

My first Figma plugins were simple replacements for features I'd missed from other apps: **Selection Saver** revived a feature I'd long missed from Adobe Illustrator. **Property Randomizer** exists because I was assigned a dashboard project and wanted my charts and data to look real enough that they wouldn't be distracting. I once needed to do a fancy regular expression replace operation in a giant Figma file but it wasn't supported at the time, so I built **Find and Replace** and it's still among my most popular plugins.

There are few things from which I derive more satisfaction than my Figma plugins. They were useful to me, sure, but knowing that so many others have been spared the same tedium I'd faced myself is just 👩‍🍳🤌 I think they're the best expression of what I'm all about.

`,
    screenshots: [
      {
        id: 'aarons-toolbox-overview',
        slug: 'overview',
        src: '/portfolio/aarons-toolbox/aarons-toolbox-community-preview.mp4',
        alt: "1 of 6: Aaron's Toolbox overview",
      },
      {
        id: 'normalizer',
        slug: 'normalizer',
        src: '/portfolio/aarons-toolbox/store-images--normalizer.png',
        alt: '2 of 6: Normalizer',
        description: `
# Small tools for repeated friction

Some Toolbox utilities automate repetitive tasks; others simplify workflows that are technically possible but needlessly tedious. Each began with a problem I encountered often enough that solving it once was worth turning into a tool.

The Normalizer helps designers identify "stray tokens" in their selections and fix them all in one swoop. It highlights the differences between your selected nodes and allows you to coerce them towards your design system.

One example use case: a designer can select a frame with dozens of font sizes throughout and, in a few clicks, "redesign" with only a few, forcing each node to choose its closest allowed size. Instant, effortless conformity!
`,
      },
      {
        id: 'randomizer',
        slug: 'randomizer',
        src: '/portfolio/aarons-toolbox/store-images--randomizer.png',
        alt: '3 of 6: Randomizer',
        description: `
# Make sample data feel believable

**Property Randomizer** began with a dashboard project. I wanted charts and data to look realistic enough that placeholder content would not distract from the design decisions being tested.

It began as an ugly form with \`min\` and \`max\` inputs for randomizing only the \`height\` property of selected nodes and quickly evolved into a whole lot more.

The latest Randomizer will write to just about any Figma node data type there is, including document variables, component properties, and individual colour channels.
`,
      },
      {
        id: 'componentizer',
        slug: 'componentizer',
        src: '/portfolio/aarons-toolbox/store-images--componentizer.png',
        alt: '4 of 6: Componentizer',
        description: `
# Create components from disparate instances

I realized that most of the components I make in Figma are created AFTER I've already hand-crafted (copy-pasted...) a few instances of the same thing. Starting with a component from the very beginning isn't always feasible, but this reverse flow meant not only creating the component itself but also configuring variants, overrides, and interactions.

The Componentizer works backwards from your already-built instances. It surfaces differences and lets you decide whether they're part of a variant or just a plain ol' override. Once you've assigned traits to their variants, one click creates the component, its variants, and any interactions you chose, and replaces your selected originals with instances of the new component. Bam! So much time and tedium saved.
`,
      },
      {
        id: 'distributor',
        slug: 'distributor',
        src: '/portfolio/aarons-toolbox/store-images--distributor.png',
        alt: '5 of 6: Distributor',
        description: `
# Useful for work AND play

The Distributor is helpful for laying out large numbers of nodes, and it's also wildly amusing to just mess around with the power of instantly and perfectly placing oodles of objects on an arbitrary path.
`,
      },
      {
        id: 'selection-saver',
        slug: 'selection-saver',
        src: '/portfolio/aarons-toolbox/store-images--selection-saver.png',
        alt: '6 of 6: Selection Saver',
        description: `
# A missing feature became a shared tool

**Selection Saver** revived a feature I missed from Adobe Illustrator. It and Property Randomizer grew into tools used by tens of thousands of people in the Figma Community—the most satisfying proof that I don't suffer this tedium alone.
`,
      },
    ],
  },
  {
    id: 'informal-systems',
    slug: 'informal-systems',
    title: 'Informal Systems',
    blurb:
      'A CMS-backed workflow that let content owners update the site without waiting on developers.',
    overviewMarkdown: `
Informal was a freelance customer of mine when their needs grew into a full-time role for me as their sole UX/UI developer. I got to wear the hats of researcher, designer, developer, internal tool builder, and more. One of my earliest contributions serves as a good example of what I brought:
`,
    screenshots: [
      {
        id: 'informal-systems-home-page',
        slug: 'home-page',
        src: '/portfolio/informal-systems/home-page.png',
        alt: '1 of 3: Homepage Overview',
        description: `
## Content ownership without design drift

The website I'd built was a simple Next.js app and lived as code on GitHub and as a hosted app on Netlify. Making a copy change was just another task for me, but a bit of a steep hill to climb for someone just looking to fix a typo on a blog post. Time to hire a CMS.

I chose Contentful for its headlessness and built a lightweight editing workflow around it. The trick was giving teams the freedom to update their own content without giving them enough freedom to accidentally, shall we say, redesign the site.
`,
      },
      {
        id: 'informal-systems-hover-to-edit',
        slug: 'hover-to-edit',
        src: '/portfolio/informal-systems/hover-to-edit.png',
        alt: '2 of 3: Hover-to-Edit',
        description: `
## One content shape for every editable surface

The staging version of the site pulls its content from Contentful, but includes content marked as \`draft\` whereas production only shows \`published\` content. In Contentful, everything takes the shape of a single, consistent object that I dubbed \`spot_copy_entry\`:

- \`path\`: A required, unique, human-readable ID for this chunk of content.
- \`body\`: Optional Rich Text content which arrives as bare HTML.
- \`media\`: An optional picker for attaching one or more images.
- \`json\`: An optional escape hatch for simple arrays, objects, or references to other \`spot_copy_entry\` paths.
`,
      },
      {
        id: 'informal-staking',
        slug: 'informal-staking',
        src: '/portfolio/informal-systems/informal-staking.png',
        alt: '3 of 3: Informal Staking',
        description: `
## Let writers own the content while design stays in code

The websites that consume Contentful content make a single request, constructed at request time around the route's needs. It fetches the copy and image paths for the request and makes them available to the page through React Context.

I built a \`ContentfulSpotCopy\` component that accepts a \`path\` and a \`render\` prop receiving the fields for that chunk of copy. From there, I can build a carousel from the images, style the body however I want, or shape a completely different interface. The writers own the content while I own the design 👌
`,
      },
    ],
  },
  {
    id: 'nextphrase',
    slug: 'nextphrase',
    title: 'Next\u00adPhrase',
    blurb: 'My own version of my favourite party game.',
    url: 'https://nextphrase.app',
    overviewMarkdown: `
Some of you may recognize the concept (it's [Catch Phrase](https://en.wikipedia.org/wiki/Catch_Phrase_(game)) by Hasbro) but I've put my own twists on it, of course.

My original motivation for making the game was two-fold: first, I kept finding myself at parties with friends wanting to play Catch Phrase, but nobody had it. If only I had it on my phone... Secondly, I wanted to try my hand at React Native.

I've built this game at least five times now. I've built it with different themes, different mechanics, and on different technologies. Now it's just a simple PWA because it's the most accessible: just visit [NextPhrase.app](https://nextphrase.app) and add it to your home screen for the best experience.

I've learned a LOT building this game over and over, including the architectural challenges of building a game where pretty much everything is animated, despite running on a wee computer without 16GB of memory to lean on. Give it a shot at your next party!
`,
    screenshots: [
      {
        id: 'nextphrase-intro',
        slug: 'intro',
        src: '/portfolio/nextphrase/intro-video.webm',
        alt: 'NextPhrase app walkthrough',
        clipToPhoneFrame: true,
      },
    ],
  },
] satisfies PortfolioProject[]

const PORTFOLIO_PROJECT_ORDER = [
  'about-me',
  'loopio',
  'freshbooks',
  'informal-systems',
  'aarons-toolbox',
  'nextphrase',
] as const

export const portfolioSlides = PORTFOLIO_PROJECT_ORDER.map(slug => {
  const project = rawPortfolioSlides.find(candidate => candidate.slug === slug)

  if (!project) {
    throw new Error(`Missing portfolio project: ${slug}`)
  }

  return transformPortfolioProjectMarkdown(project)
})

export function getPortfolioProject(slug: string) {
  return portfolioSlides.find(project => project.slug === slug)
}

export function getPortfolioScreenshot(
  project: PortfolioProject,
  slug: string,
) {
  if (project.cover_image?.slug === slug) {
    return project.cover_image
  }

  return project.screenshots.find(screenshot => screenshot.slug === slug)
}
