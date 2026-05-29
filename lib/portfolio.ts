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
Over the last few years, AI and I have become real good pals. To quote the Frank's Red Hot people, “I put that ** on everything.” What began as casual experimentation with ChatGPT quickly evolved into serious daily work with all the big ones: Cursor, Claude, Codex, and their various models and workflows.

The timing was perfect. I was getting increasingly burned out on the tedious parts of software development. Not the problem solving. Not the debugging. Not the architecture. The repetitive stuff. The tenth form. The hundredth validation rule. The boilerplate. Then AI showed up and suddenly I could outsource huge chunks of that work while staying focused on the parts I actually enjoy.

Since then I've been developing my AI-foo and building a growing collection of rules, skills, audits, and reusable context. Whenever the AI does something dumb, it's usually because I've been ambiguous. Fix the ambiguity, write it down once, and now neither of us has to make that mistake again. Over time I've accumulated a surprisingly useful toolkit for UI work, implementation details, accessibility checks, design audits, and all the little edge cases that tend to show up over and over.

I still run into silly issues, but that's part of the fun. Every mistake is an opportunity to level up my robot. What used to feel like pushing a boulder uphill now feels more like air hockey. The better I understand the problem, the better the AI can help solve it.
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

Figma Toolbox is a collection of utilities I've built to solve problems I repeatedly encounter in my own design work. Some automate repetitive tasks, others simplify common workflows, and two are actually evolutions of plugins I'd already built and refined over years of use (both with [tens of thousands of users in the Figma Community](https://www.figma.com/@aaronmw)).

My first Figma plugins were simple replacements for features I'd missed from other apps: "Saved Selections" is straight out of Adobe Illustrator's feature of the same name. "Find and Replace" was built because I needed to do a RegExp replace in a Figma file and couldn't, and I'd rather spend an hour or two building a tool than an even 30 minutes panning and scrolling and updating text by hand. "Property Randomizer" exists because I was assigned a Dashboard project and wanted my charts and data to look real enough that they wouldn't be distracting.

There are few things from which I derive more satisfaction than my Figma plugins. They were useful to me, sure, but knowing that so many others have been spared the same tedium is just 👩‍🍳🤌 They're the best expression of what I'm all about.
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
