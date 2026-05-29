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
Over the last few years, AI has become a core part of how I design and build software. What started as experimentation with ChatGPT quickly evolved into a daily workflow involving tools like Cursor, Claude, and Codex. Rather than treating AI as a novelty or replacement for engineering judgment, I've approached it as a design problem: how do you build a reliable collaborator out of an inherently ambiguous system?

My solution has been to develop a growing collection of workflows, prompts, audits, heuristics, and persistent context that allow AI tools to produce increasingly reliable results. Every failure becomes an opportunity to identify ambiguity, refine instructions, and improve the system. Over time, this has evolved into a personal toolkit that helps me prototype, debug, implement, and refine products far more quickly than traditional workflows allow.

The most interesting lesson has been that AI doesn't replace expertise. It amplifies it. The better I understand product design, frontend architecture, interaction design, and implementation constraints, the more effectively I can direct and evaluate AI-generated solutions. The result is a workflow that lets me spend less time on repetitive implementation work and more time solving meaningful problems.
`,
    screenshots: [
      {
        id: 'building-with-ai-home-page',
        slug: 'home-page',
        src: '/portfolio/building-with-ai/building-with-ai.png',
        alt: 'A snippet and visualization of the rules for building UI',
      },
    ],
  },
  {
    id: 'figma-toolbox',
    slug: 'figma-toolbox',
    title: 'Figma Toolbox',
    descriptionMarkdown: `
I love Figma, and I love building tools.

Figma Toolbox is a collection of utilities I've built to solve problems I repeatedly encounter in my own design work. Some automate repetitive tasks, others simplify common workflows, and a few are evolutions of plugins I'd already built and refined over years of use.

Over time I found myself maintaining a growing collection of small, focused tools. Rather than treating them as separate efforts, I began rethinking them as parts of a larger system: a single toolbox that could bring together proven workflows, remove unnecessary friction, and make common tasks faster and easier to access.

Building these tools gives me a playground for exploring the intersection of product design, interaction design, and software development. Each feature starts with a small annoyance or inefficiency and becomes an opportunity to improve how work gets done. Saving a few seconds once isn't interesting. Saving a few seconds hundreds of times a day is.
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
When I joined Informal Systems, one challenge quickly became apparent: the people closest to the company's work and content weren't the people updating the website. Changes flowed through a small number of technical contributors, creating unnecessary bottlenecks and slowing down communication.

I helped redesign the publishing workflow by introducing a content management system that gave teams direct control over their own content while preserving consistency and presentation quality across the site. Contributors could edit and manage information themselves without needing engineering support, dramatically reducing the operational overhead involved in maintaining the website.

The technical implementation was straightforward. The interesting problem was organizational. Multiple teams needed autonomy, but the overall experience still needed to feel coherent. My role was to create a system that balanced flexibility with structure, allowing experts to focus on their work instead of wrestling with publishing tools or waiting for someone else to make updates.

The result was a publishing workflow that scaled with the organization and removed me from the critical path—a success metric I always appreciate.
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
