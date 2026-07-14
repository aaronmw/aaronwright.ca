export type PortfolioScreenshot = {
  id: string;
  slug: string;
  src: string;
  alt: string;
};

export type PortfolioProject = {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  url?: string;
  descriptionMarkdown: string;
  screenshots: PortfolioScreenshot[];
};

const MARKDOWN_ACRONYMS = {
  AI: 'Artificial Intelligence',
  CMS: 'Content Management System',
  UI: 'User Interface',
  UX: 'User Experience',
} as const;

const MARKDOWN_ACRONYM_PATTERN = new RegExp(
  `(^|[^A-Za-z0-9])(${Object.keys(MARKDOWN_ACRONYMS).join('|')})(?=$|[^A-Za-z0-9])`,
  'g'
);
const MARKDOWN_SKIP_PATTERN =
  /(```[\s\S]*?```|`[^`\n]+`|!?\[[^\]]*]\([^)]*\)|<[^>]+>)/g;
const MARKDOWN_FENCE_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g;
const MARKDOWN_BLOCK_SEPARATOR_PATTERN = /(\n\s*\n)/g;
const MARKDOWN_STANDALONE_LINE_PATTERN =
  /^\s*(?:(?:[-+*]|\d+[.)])\s+|>\s*)/;

function escapeHtmlAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function transformMarkdownAcronyms(markdown: string) {
  return markdown
    .split(MARKDOWN_SKIP_PATTERN)
    .map((segment, index) => {
      if (index % 2 === 1) {
        return segment;
      }

      return segment.replace(
        MARKDOWN_ACRONYM_PATTERN,
        (match, prefix: string, acronym: keyof typeof MARKDOWN_ACRONYMS) =>
          `${prefix}<abbr title="${escapeHtmlAttribute(
            MARKDOWN_ACRONYMS[acronym]
          )}">${acronym}</abbr>`
      );
    })
    .join('');
}

function bindLastTwoTokens(value: string) {
  return value.replace(/(\S)[\t\r\n ]+(\S+)(\s*)$/, '$1&nbsp;$2$3');
}

function preventMarkdownOrphans(markdown: string) {
  return markdown
    .split(MARKDOWN_FENCE_PATTERN)
    .map((segment, fenceIndex) => {
      if (fenceIndex % 2 === 1) {
        return segment;
      }

      return segment
        .split(MARKDOWN_BLOCK_SEPARATOR_PATTERN)
        .map((block) => {
          if (!block.trim()) {
            return block;
          }

          const lines = block.split('\n');
          const isStandaloneLineBlock = lines
            .filter((line) => line.trim())
            .every((line) => MARKDOWN_STANDALONE_LINE_PATTERN.test(line));

          return isStandaloneLineBlock
            ? lines.map(bindLastTwoTokens).join('\n')
            : bindLastTwoTokens(block);
        })
        .join('');
    })
    .join('');
}

function transformPortfolioMarkdown(markdown: string) {
  return transformMarkdownAcronyms(preventMarkdownOrphans(markdown));
}

function transformPortfolioProjectMarkdown(
  project: PortfolioProject
): PortfolioProject {
  return {
    ...project,
    blurb: transformPortfolioMarkdown(project.blurb),
    descriptionMarkdown: transformPortfolioMarkdown(project.descriptionMarkdown),
  };
}

const rawPortfolioSlides = [
  {
    id: 'building-with-ai',
    slug: 'building-with-ai',
    title: 'Building with AI',
    blurb:
      'How I use **AI** as a practical collaborator for faster, more flexible product work.',
    descriptionMarkdown: `
I'm including this slide up top because, while it may not constitute a "project" per se, it's a hot topic and it's gonna come up. The tl;dr is that I've enthusiastically adopted AI because it handles the tedious stuff while I can stay focused on steering the actual project.

AI hit the scene just as I was burning out on all the coding I'd been doing as the UX/UI guy for a handful of different teams. While AI wasn't as adept as it is today, it made short work of large refactors where I'd otherwise have settled for less-than-ideal. With these tools, I feel more "agile" than ever: experimenting with major architectural pivots is almost trivial. The Devil, as always, is in the details.

I'd already fancied myself a pretty quick draw in the Wild West of frontend dev. I had a whole arsenal of boilerplates from which I'd begin new projects, as well as various workflows and patterns that I could flex from muscle memory. I was briefly worried all that effort would be obsoleted, but it proved to be an agent-onboarding _goldmine_. Granted, I'm still updating the core skills on a daily basis with new or improved articulations of all sorts of nuances and nitpicks, but the static friction of starting a new project has been drastically reduced and I've found a renewed enthusiasm for building.

While I've yet to collaborate with others on an AI-assisted project, I'm super keen to see how it can transform entire teams of people contributing to a shared skillset. I'm equal parts excited and anxious to see how it transforms the worlds of software, services, and products both digital and physical.
`,
    screenshots: [
      {
        id: 'building-with-ai-home-page',
        slug: 'home-page',
        src: '/portfolio/building-with-ai/building-with-ai.png',
        alt: 'Building with AI overview',
      },
    ],
  },
  {
    id: 'aarons-toolbox',
    slug: 'aarons-toolbox',
    title: "Aaron's Toolbox",
    blurb:
      'A suite of **Figma plugins** for cleaning, remixing, and organizing design work.',
    descriptionMarkdown: `
I'm infatuated with Figma both as a user and as a developer building on their platform. I'm equally obsessed with the art and science of tool-building, so the match is cosmically perfect.

**Aaron's Toolbox** is a collection of utilities I've built to solve problems I repeatedly encounter in my own design work. Some automate repetitive tasks, others simplify common workflows, and two are actually evolutions of plugins I'd already built and refined over years of use (both with [tens of thousands of users in the Figma Community](https://www.figma.com/@aaronmw)).

My first Figma plugins were simple replacements for features I'd missed from other apps: **Selection Saver** revived a feature I'd long missed from Adobe Illustrator. **Property Randomizer** exists because I was assigned a Dashboard project and wanted my charts and data to look real enough that they wouldn't be distracting. I once needed to do a fancy regular expression replace operation in a giant Figma file but it wasn't supported at the time, so I built **Find and Replace** and it's still among my most popular plugins.

There are few things from which I derive more satisfaction than my Figma plugins. They were useful to me, sure, but knowing that so many others have been spared the same tedium I'd faced myself is just 👩‍🍳🤌 I think they're the best expression of what I'm all about.

`,
    screenshots: [
      {
        id: 'aarons-toolbox-overview',
        slug: 'overview',
        src: '/portfolio/aarons-toolbox/store-images--four-up.png',
        alt: "1 of 5: Aaron's Toolbox overview",
      },
      {
        id: 'normalizer',
        slug: 'normalizer',
        src: '/portfolio/aarons-toolbox/store-images--normalizer.png',
        alt: '2 of 5: Normalizer',
      },
      {
        id: 'randomizer',
        slug: 'randomizer',
        src: '/portfolio/aarons-toolbox/store-images--randomizer.png',
        alt: '3 of 5: Randomizer',
      },
      {
        id: 'componentizer',
        slug: 'componentizer',
        src: '/portfolio/aarons-toolbox/store-images--componentizer.png',
        alt: '4 of 5: Componentizer',
      },
      {
        id: 'selection-saver',
        slug: 'selection-saver',
        src: '/portfolio/aarons-toolbox/store-images--selection-saver.png',
        alt: '5 of 5: Selection Saver',
      },
    ],
  },
  {
    id: 'informal-systems',
    slug: 'informal-systems',
    title: 'Informal Systems',
    blurb:
      'A CMS-backed workflow that let content owners update the site without waiting on developers.',
    descriptionMarkdown: `
Informal was a freelance customer of mine when their needs grew into a full-time role as the sole UX/UI developer. I got to wear the hats of researcher, designer, developer, internal tool builder, and more. One of my earliest contributions serves as a good example of what I brought:

The website I'd built was a simple NextJS app and lived as code on Github and as a hosted app on Netlify. Making a copy change was just another task for me, but a bit of a steep hill to climb for someone just looking to fix a typo on a blog post. Time to hire a CMS.

I chose Contentful for its headlessness and built a lightweight editing workflow around it. The trick was giving teams the freedom to update their own content without giving them enough freedom to accidentally, shall we say, redesign the site.

The staging version of the site pulls its content from Contentful, but includes content marked as \`draft\` whereas production only shows \`published\` content. My solution took the following shape:

# One Contentful Object to Rule Them All...

In Contentful, everything is in the shape of a single, consistent object that I dubbed, \`spot_copy_entry\`.

- \`path\`: A required, unique, human-readable ID for this chunk of content.

- \`body\`: Optional. It holds special Rich Text content which arrives as bare HTML.

- \`media\`: Optional. This field renders as a "picker" in Contentful, affording users the ability to attach one or more images.

- \`json\`: Optional. An escape hatch for content that doesn't fit the mould. Typically holds simple arrays or objects, often just references to other \`spot_copy_entry\` paths.

# One Query to Bring Them All...


# And in the React Component layer, Bind Them

`,
    screenshots: [
      {
        id: 'informal-systems-home-page',
        slug: 'home-page',
        src: '/portfolio/informal-systems/home-page.png',
        alt: '1 of 3: Homepage Overview',
      },
      {
        id: 'informal-systems-hover-to-edit',
        slug: 'hover-to-edit',
        src: '/portfolio/informal-systems/hover-to-edit.png',
        alt: '2 of 3: Hover-to-Edit',
      },
      {
        id: 'informal-staking',
        slug: 'informal-staking',
        src: '/portfolio/informal-systems/informal-staking.png',
        alt: '3 of 3: Informal Staking',
      },
    ],
  },
  {
    id: 'mini-series-browser',
    slug: 'mini-series-browser',
    title: 'Mini Series Browser',
    blurb:
      'I can never decide what to watch, and am too easily persuaded (or disuaded) by cover art. So I built this.',
    url: 'https://mini-series-browser.netlify.app',
    descriptionMarkdown: `
Deciding what to watch is harder and harder with all the options spread over all the providers. I've also grown a little resentful of "normal" television series failing to conclude either because they were cancelled, or because concluding would mean they couldn't make another season. This led me to narrow the pool substantially to limited series productions only: stories that are started with an ending in mind, told over an arc of 2 to 12 episodes.

The UI has evolved from a very scrappy list titles, to a much more functional tool usable by people other than myself. With over 600 titles to render, there was a lot of optimization work including list virtualization, image caching, and more.

The most immediate "optimization" was free, and the reason I built it in the first place: by default, it only shows short descriptions of each title. No cover art. No ratings. No ways to watch. No distractions!

It's also got some fun details and bits of polish, especially on desktop: the spotlight follows your focus, the keyboard will move you around, into, and out of title cards, and even the direction in which cards open on screen is designed to prevent as much scrolling as possible, since it's easy to lose one's place in a sea of 600+ pretty similar-looking items.

It's still getting regular updates and polish as I find opportunities.
`,
    screenshots: [
      {
        id: 'mini-series-browser-descriptions-only',
        slug: 'descriptions-only',
        src: '/portfolio/mini-series-browser/mini-series-browser--1-descriptions-only.png',
        alt: '1 of 4: Mini Series Browser descriptions-only view on desktop and mobile',
      },
      {
        id: 'mini-series-browser-expanded-card',
        slug: 'expanded-card',
        src: '/portfolio/mini-series-browser/mini-series-browser--2-expanded-card.png',
        alt: '2 of 4: Mini Series Browser expanded card on desktop and mobile',
      },
      {
        id: 'mini-series-browser-filters',
        slug: 'filters',
        src: '/portfolio/mini-series-browser/mini-series-browser--3-filters.png',
        alt: '3 of 4: Mini Series Browser filters on desktop and mobile',
      },
      {
        id: 'mini-series-browser-poster-grid',
        slug: 'poster-grid',
        src: '/portfolio/mini-series-browser/mini-series-browser--4-poster-grid.png',
        alt: '4 of 4: Mini Series Browser poster cards on desktop and mobile',
      },
    ],
  },
  {
    id: 'nextphrase',
    slug: 'nextphrase',
    title: 'NextPhrase',
    blurb:
      'A placeholder section for a mobile **phrase guessing** party game.',
    url: 'https://nextphrase.app',
    descriptionMarkdown: `
Content coming soon.
`,
    screenshots: [
      {
        id: 'nextphrase-home',
        slug: 'home',
        src: '/portfolio/nextphrase/home.png',
        alt: '1 of 9: NextPhrase home screen',
      },
      {
        id: 'nextphrase-scoring',
        slug: 'scoring',
        src: '/portfolio/nextphrase/scoring.png',
        alt: '2 of 9: NextPhrase scoring screen',
      },
      {
        id: 'nextphrase-hearts-lost',
        slug: 'hearts-lost',
        src: '/portfolio/nextphrase/hearts-lost.png',
        alt: '3 of 9: NextPhrase scoring screen with both teams missing hearts',
      },
      {
        id: 'nextphrase-in-game-normal',
        slug: 'in-game-normal',
        src: '/portfolio/nextphrase/in-game-normal.png',
        alt: '4 of 9: NextPhrase in-game normal mode',
      },
      {
        id: 'nextphrase-in-game-alarm',
        slug: 'in-game-alarm',
        src: '/portfolio/nextphrase/in-game-alarm.png',
        alt: '5 of 9: NextPhrase in-game alarm mode',
      },
      {
        id: 'nextphrase-end-round',
        slug: 'end-round',
        src: '/portfolio/nextphrase/end-round.png',
        alt: '6 of 9: NextPhrase end-round scoring screen',
      },
      {
        id: 'nextphrase-end-game',
        slug: 'end-game',
        src: '/portfolio/nextphrase/end-game.png',
        alt: '7 of 9: NextPhrase end-game winner screen',
      },
      {
        id: 'nextphrase-options',
        slug: 'options',
        src: '/portfolio/nextphrase/options.png',
        alt: '8 of 9: NextPhrase options screen',
      },
      {
        id: 'nextphrase-instructions',
        slug: 'instructions',
        src: '/portfolio/nextphrase/instructions.png',
        alt: '9 of 9: NextPhrase how-to-play screen',
      },
    ],
  },
] satisfies PortfolioProject[];

export const portfolioSlides = rawPortfolioSlides.map(
  transformPortfolioProjectMarkdown
);

export function getPortfolioProject(slug: string) {
  return portfolioSlides.find((project) => project.slug === slug);
}

export function getPortfolioScreenshot(
  project: PortfolioProject,
  slug: string
) {
  return project.screenshots.find((screenshot) => screenshot.slug === slug);
}
