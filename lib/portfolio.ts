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
  descriptionMarkdown: string;
  screenshots: PortfolioScreenshot[];
};

export const portfolioSlides = [
  {
    id: 'building-with-ai',
    slug: 'building-with-ai',
    title: 'Building with AI',
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
    id: 'figma-toolbox',
    slug: 'figma-toolbox',
    title: 'Figma Toolbox',
    descriptionMarkdown: `
I'm kind of infatuated with Figma as a user and as a developer building on their platform. I'm equally obsessed with tool-building so the match is cosmically perfect.

Figma Toolbox is a collection of utilities I've built to solve problems I repeatedly encounter in my own design work. Some automate repetitive tasks, others simplify common workflows, and two are actually evolutions of plugins I'd already built and refined over years of use (both with [tens of thousands of users in the Figma Community](https://www.figma.com/@aaronmw)).

My first Figma plugins were simple replacements for features I'd missed from other apps: **Selection Saver** revived a feature I'd long missed from Adobe Illustrator. **Property Randomizer** exists because I was assigned a Dashboard project and wanted my charts and data to look real enough that they wouldn't be distracting. I once needed to do a fancy regular expression replace operation in a giant Figma file but it wasn't supported at the time, so I built **Find and Replace** and it's still among my most popular plugins.

There are few things from which I derive more satisfaction than my Figma plugins. They were useful to me, sure, but knowing that so many others have been spared the same tedium I'd faced myself is just 👩‍🍳🤌 I think they're the best expression of what I'm all about.
`,
    screenshots: [
      {
        id: 'normalizer',
        slug: 'normalizer',
        src: '/portfolio/figma-toolbox/normalizer.png',
        alt: '1 of 4: Normalizer',
      },
      {
        id: 'randomizer',
        slug: 'randomizer',
        src: '/portfolio/figma-toolbox/randomizer.png',
        alt: '2 of 4: Randomizer',
      },
      {
        id: 'componentizer',
        slug: 'componentizer',
        src: '/portfolio/figma-toolbox/componentizer.png',
        alt: '3 of 4: Componentizer',
      },
      {
        id: 'node-wrangler',
        slug: 'node-wrangler',
        src: '/portfolio/figma-toolbox/node-wrangler.png',
        alt: '4 of 4: Node Wrangler',
      },
    ],
  },
  {
    id: 'informal-systems',
    slug: 'informal-systems',
    title: 'Informal Systems',
    descriptionMarkdown: `
When I first started working with Informal Systems, one thing quickly became obvious: the people who knew the content best weren't the people updating the website.

Every change had to flow through a small number of technical contributors. Sometimes that was me. Someone would notice a typo, want to tweak some copy, reorder a project, or update a description, and suddenly we were creating tickets and waiting around for someone else to make a five minute change.

I chose Contentful as our CMS and built a lightweight editing workflow around it. The trick was giving teams the freedom to update their own content without giving them enough rope to accidentally redesign the site. Contributors could simply hover over content on the page, jump directly into editing mode, make their changes, and move on with their day.

The best part is that it mostly made me unnecessary. Requests disappeared, content stayed current, and the people closest to the work could tell their own stories without waiting for me to get around to it.
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
] satisfies PortfolioProject[];

export function getPortfolioProject(slug: string) {
  return portfolioSlides.find((project) => project.slug === slug);
}

export function getPortfolioScreenshot(
  project: PortfolioProject,
  slug: string
) {
  return project.screenshots.find((screenshot) => screenshot.slug === slug);
}
