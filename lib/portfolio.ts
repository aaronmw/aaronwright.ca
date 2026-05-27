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

export const portfolioProjects = [
  {
    id: 'field-notes',
    slug: 'field-notes',
    title: 'Field Notes',
    descriptionMarkdown: `
Field Notes is a placeholder case study for a compact product surface that helps teams collect, compare, and act on observations from the field.

The final version can use this area for the full project story: the problem, the constraints, the role, the outcome, and links to live work or deeper writing.

For now, the screenshots are intentionally simple local assets. Replace the image paths in this file with real exported PNGs when the portfolio content is ready.
`,
    screenshots: [
      {
        id: 'field-notes-map',
        slug: 'map',
        src: '/portfolio/field-notes/map.svg',
        alt: 'Placeholder map dashboard for Field Notes',
      },
      {
        id: 'field-notes-detail',
        slug: 'detail',
        src: '/portfolio/field-notes/detail.svg',
        alt: 'Placeholder observation detail screen for Field Notes',
      },
    ],
  },
  {
    id: 'interface-lab',
    slug: 'interface-lab',
    title: 'Interface Lab',
    descriptionMarkdown: `
Interface Lab is a placeholder project for rapid interaction studies, design systems, and small UI tools.

This description is Markdown, so it can include **emphasis**, lists, and links like [aaronwright.ca](https://aaronwright.ca) without changing the rendering code.

Use this record as the template for adding more projects. Each screenshot gets its own slug so it can be routed and shared directly.
`,
    screenshots: [
      {
        id: 'interface-lab-components',
        slug: 'components',
        src: '/portfolio/interface-lab/components.svg',
        alt: 'Placeholder component overview for Interface Lab',
      },
      {
        id: 'interface-lab-flow',
        slug: 'flow',
        src: '/portfolio/interface-lab/flow.svg',
        alt: 'Placeholder flow editor for Interface Lab',
      },
      {
        id: 'interface-lab-mobile',
        slug: 'mobile',
        src: '/portfolio/interface-lab/mobile.svg',
        alt: 'Placeholder mobile interface for Interface Lab',
      },
    ],
  },
  {
    id: 'archive-room',
    slug: 'archive-room',
    title: 'Archive Room',
    descriptionMarkdown: `
Archive Room is a placeholder for a content-heavy project with browsing, retrieval, and comparison workflows.

The portfolio browser treats this text as the first screen in portrait and keeps it beside the image area in landscape, making longer written case studies possible without losing the visual browsing rhythm.

Replace this copy with a real multi-paragraph narrative when the screenshots are finalized.
`,
    screenshots: [
      {
        id: 'archive-room-library',
        slug: 'library',
        src: '/portfolio/archive-room/library.svg',
        alt: 'Placeholder archive library screen',
      },
      {
        id: 'archive-room-record',
        slug: 'record',
        src: '/portfolio/archive-room/record.svg',
        alt: 'Placeholder archive record screen',
      },
    ],
  },
] satisfies PortfolioProject[];

export function getPortfolioProject(slug: string) {
  return portfolioProjects.find((project) => project.slug === slug);
}

export function getPortfolioScreenshot(
  project: PortfolioProject,
  slug: string
) {
  return project.screenshots.find((screenshot) => screenshot.slug === slug);
}
