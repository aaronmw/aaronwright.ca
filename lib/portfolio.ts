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

Loopio's core RFP workflow had outgrown the frontend beneath it. I partnered with Thomas Cheng to turn a redesign proposal into a working product, then carried that momentum into a tested, documented React system other teams could safely extend.
`

const FRESHBOOKS_OVERVIEW = `
# Making accounting approachable without pretending it was simple

I joined the small group reimagining FreshBooks as a coherent platform: clearer workflows, reusable interaction patterns, and a reversible transition that let customers move forward without being trapped there.
`

const rawPortfolioSlides = [
  {
    id: 'loopio',
    slug: 'loopio',
    title: 'Loopio',
    blurb:
      'Our "What If?" prototype got serious traction and went on to replace the original Loopio product. Then I built, documented, and championed a shared system for teams to build upon.',
    overviewMarkdown: LOOPIO_OVERVIEW,
    rolesMarkdown: 'Principal Designer → Sr. UX Engineer',
    dates: '2018–2022',
    cover_image: {
      id: 'loopio-cover',
      slug: 'cover',
      src: '/portfolio/loopio-case-study/project workspace.png',
      alt: 'Loopio project workspace in the current product',
    },
    screenshots: [
      {
        id: 'loopio-legacy-workspace',
        slug: 'a-mature-product',
        src: '/portfolio/loopio-case-study/old-pws-magic.png',
        alt: 'Loopio project workspace before the redesign',
        description: `
## The problem: the original prototype had overstayed its welcome

Loopio had found product-market fit, but its interface had accumulated several generations of frontend tech: jQuery, Backbone, React, Redux, Bootstrap, and one-off controls living side by side.

That inconsistency became most expensive in Projects, where teams coordinate hundreds of dense, interdependent RFP responses. The product needed to present a clearer model for the work being done, and a design foundation capable of expressing it consistently.
`,
      },
      {
        id: 'loopio-working-prototype',
        slug: 'working-prototype',
        src: '/portfolio/loopio-case-study/prototype-live-collaboration.png',
        alt: 'Loopio working prototype showing live collaboration',
        description: `
## Keep the experiment small enough to become real

Thomas joined in August 2018, and we used the redesigned Projects experience as a contained proving ground. I shaped the workflow and interaction model; together we turned it into a working product rather than another presentation of intent.

That distinction mattered. People could use the idea, react to it, and discuss tradeoffs around something concrete. The prototype built confidence because it demonstrated both a better customer experience and a plausible way to build it.
`,
      },
      {
        id: 'loopio-dense-work',
        slug: 'dense-work',
        src: '/portfolio/loopio-case-study/project-bulk-assignment.png',
        alt: 'Loopio project redesign with bulk assignment controls',
        description: `
## Make dense work manageable

RFP work is inherently complicated; the interface didn't need to make it feel more complicated. The redesign treated the project as a persistent workspace, with navigation and contextual tools close to the questions they affected.

Across the broader Projects work, I explored patterns for structure, assignment, timelines, supporting assets, and bulk operations. The goal was not to conceal complexity, but to give teams a legible way to move through it without losing context.
`,
      },
      {
        id: 'loopio-product-momentum',
        slug: 'product-momentum',
        src: '/portfolio/loopio-case-study/project-list-view.png',
        alt: 'Loopio project list redesign',
        description: `
## A prototype people wanted became a product teams could inherit

The work earned real internal momentum. Sales had a more compelling story to show; customers could respond to the experience directly; product and engineering could evaluate it against the realities of a mature application.

The path into production required more than enthusiasm. We worked through test coverage, migration constraints, eligibility, and the seams between the prototype and the existing product. The experiment was becoming infrastructure.
`,
      },
      {
        id: 'loopio-shared-system',
        slug: 'shared-system',
        src: '/portfolio/loopio-case-study/loopui-storybook.png',
        alt: 'Recovered LoopUI Storybook documenting the Anchor component',
        description: `
## From Principal Designer to the engineer behind the system

After Thomas left in June 2020, I kept moving the foundation forward and formally became a Senior UX Engineer in January 2021. The job shifted from proving the direction to making it dependable for everyone else.

I built TypeScript React components, kept Figma and production aligned, documented usage, strengthened tests, and worked through accessibility and responsive behaviour. The recovered LoopUI Storybook shown here is one surviving artifact of that shared contract.
`,
      },
      {
        id: 'loopio-selectable-table',
        slug: 'selectable-table',
        src: '/portfolio/loopio-case-study/loopui-selectable-table.png',
        alt: 'Recovered LoopUI Storybook documentation for a selectable table',
        description: `
## The component was never just the component

A sortable, selectable table sounds small until it has to support real product teams: stable layout, meaningful defaults, keyboard access, selection, sorting, loading states, and enough flexibility for unfamiliar data.

This kind of work became the practical bridge between design intent and implementation. Components encoded decisions once, documentation made those decisions discoverable, and tests gave teams the confidence to reuse the result without reopening every old debate.
`,
      },
      {
        id: 'loopio-enduring-lineage',
        slug: 'enduring-lineage',
        src: '/portfolio/loopio-case-study/current-proposal-summary.jpg',
        alt: 'A current Loopio proposal workspace with recognizable design-system lineage',
        description: `
## The most useful outcome was leverage

Loopio replaced the old frontend and product teams continued extending the system. The team observed stronger engagement with the redesigned experience, and Sales found it easier to communicate where the product was going.

I don't claim sole ownership of the product visible today. I do recognize the lineage: the workspace model, the visual language, and the expectation that design decisions should be reusable and buildable. The work changed my own trajectory too—from designing the answer to improving the conditions in which many people could build answers.
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
      src: '/portfolio/freshbooks-current/invoice-create.png',
      alt: 'The current FreshBooks invoice editor',
    },
    screenshots: [
      {
        id: 'freshbooks-early-client-overview',
        slug: 'client-first',
        src: '/portfolio/freshbooks-case-study/early-client-overview.png',
        alt: 'An early FreshBooks redesign exploration organized around clients',
        description: `
## Begin with the person doing the work

FreshBooks was already loved by small-business owners, but years of growth had left important workflows constrained by their original foundations. The redesign group had to rethink the product without discarding the approachability people depended on.

This early exploration reorganized the experience around clients and their activity rather than exposing the accounting model first. It wasn't the final answer. It was a useful provocation: what would the product become if it reflected how customers understood their businesses?
`,
      },
      {
        id: 'freshbooks-early-client-activity',
        slug: 'one-system',
        src: '/portfolio/freshbooks-case-study/early-client-activity.png',
        alt: 'An early FreshBooks redesign exploration combining client activity',
        description: `
## Redesign the product as one system

Invoices, estimates, expenses, projects, and payments could not each become their own little redesign. We needed a coherent product language that made related objects feel related and repeated actions behave the same way.

I worked across interaction models and shared patterns, using concrete screens to test whether the system held together. The work moved between product design and systems design constantly: solve a real workflow, notice the reusable idea inside it, then make that idea strong enough to travel.
`,
      },
      {
        id: 'freshbooks-metadata-pane',
        slug: 'metadata-pane',
        src: '/portfolio/freshbooks-current/invoice-create-filled.png',
        alt: 'FreshBooks invoice editor with contextual settings in a right-side pane',
        description: `
## Keep the document visible while its settings change

One of my signature contributions was the contextual metadata pane: secondary settings stayed close at hand without replacing the invoice, estimate, or client someone was working on.

The pattern reduced navigation and preserved context. It also created a scalable place for options that mattered but did not deserve equal visual weight with the primary task. The current product screenshot shown here is not the original artifact, but it makes the durability of that interaction model easy to see.
`,
      },
      {
        id: 'freshbooks-reversible-migration',
        slug: 'reversible-migration',
        src: '/portfolio/freshbooks-case-study/classic-missing-feature.png',
        alt: 'FreshBooks switch-back flow asking which feature a customer needed',
        description: `
## Make migration reversible—and informative

A redesign this broad could not arrive as a trap door. Customers needed a safe way to try the new FreshBooks, return to Classic when their work demanded it, and tell us what had blocked them.

That reversibility reduced the cost of trying the new experience. The switch-back flow also turned retreat into useful product feedback: missing features and workflow gaps became visible signals the team could respond to instead of silent frustration.
`,
      },
      {
        id: 'freshbooks-shared-patterns',
        slug: 'shared-patterns',
        src: '/portfolio/freshbooks-case-study/sketch-design-system-library.png',
        alt: 'Current FreshBooks project creation flow using shared form and settings patterns',
        description: `
## Build the shared system alongside the product

The redesign was a platform effort, not a sequence of isolated mockups. Repeated controls, layouts, and behaviours had to become reliable building blocks so teams could create new workflows without re-inventing FreshBooks each time.

My role sat naturally between the product and that system: clarifying interaction rules, applying them across features, and helping design and engineering converge on the same answer. Consistency was not decoration; it was how the product became easier to learn and safer to extend.
`,
      },
      {
        id: 'freshbooks-endurance',
        slug: 'endurance',
        src: '/portfolio/freshbooks-current/invoices-list-populated.png',
        alt: 'The current FreshBooks invoices list',
        description: `
## Endurance is a better measure than novelty

FreshBooks kept evolving after I left in 2018, as it should. The valuable signal is not whether every pixel survived. It is that recognizable structural ideas remain: approachable language, contextual settings, repeatable controls, and related workflows that feel like one product.

The project taught me to design change as carefully as the destination. A system earns trust when it helps customers move at their own pace and gives product teams enough structure to keep improving it after the original designers have gone.
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
I’ve spent the past 27 years working somewhere between product design and frontend engineering. I’ve designed products, built design systems and frontend foundations, improved workflows, taught interaction design, mentored designers and engineers, and spent an inordinate amount of time removing friction that other people had apparently just learned to live with.

I got into this whole web development game back in 1999. I’d just finished the 7th grade when my family relocated three hours away from where I’d grown up. Stuck in a new town and staring down a full summer of nothin’ to do, I decided I’d tinker with the family computer.

My brother had sent home a copy of Microsoft Office 2000 from university for my dad to use for bookkeeping. Most of the included applications were already familiar to me, but FrontPage stood out. I still vividly remember poking around its interface, confounded. It looked a lot like Word, but not exactly. The page had no boundaries—just a sea of white. I dove right in.

After a few hours of poking around and searching online, I’d cracked the secret of this FrontPage app: it was a word processor that published _to the Internet_. I made a Tripod account and immediately built myself a homepage, complete with GIFs, custom fonts, and marquees—the staples. Days after discovering FrontPage, I’d published my first site for the world to see, with its own URL. I was hooked.

I eventually found my way into Code View. Initially vexed by the screens of gibberish, I started to recognize my own prose amongst the strange characters. Through trial and error, I began building a mental model of the relationship between the page and the code behind it.

It wasn’t long before I was building tools to do my homework—and my friends’ homework. Then I started building sites in exchange for web hosting and computer parts. That turned into more formal work building websites and apps and getting paid in real, spendable money.

All these years later, I’m definitely more familiar with the tools, but I’m still just as curious and passionate about building things and watching other people use them. Along the way, I’ve also taken a fancy to teaching. I taught interaction design first in the joint York/Sheridan Design program, and later in Sheridan’s own program after the schools went separate ways.

By the time AI hit the scene, I’d already spent years building custom scripts and tools to expedite the boring bits. AI didn’t invent that instinct; it did greatly extend what was possible.

What interested me wasn’t only the speed. It was the opportunity to rethink how people move from an idea to a working product—and what designers and engineers could accomplish together once some of the old boundaries started to wobble.

Today, I do my best work helping other people do theirs: running critiques, teaching and mentoring, building better systems and practices, smoothing friction between design and engineering, and finding useful ways to bring AI into the work.

I care about raising the bar without making the work heavier—making excellent work clearer, easier, and more satisfying for everyone involved.

If you’re building at the seam between design and engineering or figuring out what AI should actually change about the way your team works, let’s talk!
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
`,
      },
      {
        id: 'componentizer',
        slug: 'componentizer',
        src: '/portfolio/aarons-toolbox/store-images--componentizer.png',
        alt: '4 of 6: Componentizer',
        description: `
# Turn the workaround into a workflow

My plugins usually start as a workaround for one file. The useful ones reveal a repeatable workflow, earn clearer controls, and eventually become dependable enough to share with other designers.
`,
      },
      {
        id: 'distributor',
        slug: 'distributor',
        src: '/portfolio/aarons-toolbox/store-images--distributor.png',
        alt: '5 of 6: Distributor',
        description: `
# Spend less time on the mechanical parts

The collection reflects what I value in tools: remove the mechanical work, preserve the designer's judgment, and make the useful action easy to repeat without making the interface feel heavy.
`,
      },
      {
        id: 'selection-saver',
        slug: 'selection-saver',
        src: '/portfolio/aarons-toolbox/store-images--selection-saver.png',
        alt: '6 of 6: Selection Saver',
        description: `
# A missing feature became a shared tool

**Selection Saver** revived a feature I missed from Adobe Illustrator. It and Property Randomizer grew into tools used by tens of thousands of people in the Figma Community—the most satisfying proof that my private friction was not mine alone.
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
        alt: '1 of 10: NextPhrase app walkthrough',
        clipToPhoneFrame: true,
      },
      {
        id: 'nextphrase-home',
        slug: 'home',
        src: '/portfolio/nextphrase/nextphrase--1.png',
        alt: '2 of 10: NextPhrase home screen',
        clipToPhoneFrame: true,
        description: `
# The party game that is always in your pocket

I kept ending up at parties where friends wanted to play Catch Phrase but nobody had it. A version on my phone could always be available—and gave me a reason to try building with React Native.
`,
      },
      {
        id: 'nextphrase-round-start',
        slug: 'round-start',
        src: '/portfolio/nextphrase/nextphrase--2.png',
        alt: '3 of 10: NextPhrase team scoreboard and round-start screen',
        clipToPhoneFrame: true,
        description: `
# Rebuilding it became part of the project

I have built NextPhrase at least five times, across different technologies, themes, and mechanics. Each version became a practical way to learn a new stack while keeping the product problem familiar.
`,
      },
      {
        id: 'nextphrase-in-game',
        slug: 'in-game',
        src: '/portfolio/nextphrase/nextphrase--3.png',
        alt: '4 of 10: NextPhrase live round with a phrase and pass control',
        clipToPhoneFrame: true,
        description: `
# A small device doing a lot at once

Almost everything in the game moves. Rebuilding it taught me how much architectural care animation requires when the interface is running on a phone instead of a development machine with memory to spare.
`,
      },
      {
        id: 'nextphrase-hearts-lost',
        slug: 'hearts-lost',
        src: '/portfolio/nextphrase/nextphrase--4.png',
        alt: '5 of 10: NextPhrase team screen with both teams missing hearts',
        clipToPhoneFrame: true,
        description: `
# Familiar rules, room to experiment

Keeping the central game recognizable gave me room to try different themes and mechanics around it. The constraints stayed clear even as the presentation and implementation changed.
`,
      },
      {
        id: 'nextphrase-winner',
        slug: 'winner',
        src: '/portfolio/nextphrase/nextphrase--5.png',
        alt: '6 of 10: NextPhrase winner screen for Team A',
        clipToPhoneFrame: true,
        description: `
# The simplest version became the most accessible

NextPhrase is now a PWA: visit [NextPhrase.app](https://nextphrase.app), add it to your home screen, and it is ready for the next party without an app-store install.
`,
      },
      {
        id: 'nextphrase-instructions',
        slug: 'instructions',
        src: '/portfolio/nextphrase/nextphrase--6.png',
        alt: '7 of 10: NextPhrase how-to-play seating instructions',
        clipToPhoneFrame: true,
        description: `
# Teach the game where it is played

The instructions live inside the same handheld experience as the game. Players can get situated and understand the setup without passing around a separate rulebook.
`,
      },
      {
        id: 'nextphrase-instructions-passing',
        slug: 'instructions-passing',
        src: '/portfolio/nextphrase/nextphrase--7.png',
        alt: '8 of 10: NextPhrase how-to-play phrase-passing instructions',
        clipToPhoneFrame: true,
        description: `
# Make the handoff obvious

Each instruction focuses on the action players need next. Clear passing guidance matters when the phone itself moves rapidly around the group.
`,
      },
      {
        id: 'nextphrase-instructions-winning',
        slug: 'instructions-winning',
        src: '/portfolio/nextphrase/nextphrase--8.png',
        alt: '9 of 10: NextPhrase how-to-play winning instructions',
        clipToPhoneFrame: true,
        description: `
# Keep the outcome easy to read

The score and winning conditions stay visual so the group can follow the game at a glance instead of stopping to interpret the interface.
`,
      },
      {
        id: 'nextphrase-options',
        slug: 'options',
        src: '/portfolio/nextphrase/nextphrase--9.png',
        alt: '10 of 10: NextPhrase options screen',
        clipToPhoneFrame: true,
        description: `
# A durable playground for new ideas

Every rebuild has taught me something about games, animation, and frontend architecture. The result is useful, but the repeated practice is what keeps bringing me back to it.
`,
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
