import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { PortfolioBrowser } from '@/components/portfolio/PortfolioBrowser';
import {
  getPortfolioProject,
  getPortfolioScreenshot,
  portfolioProjects,
} from '@/lib/portfolio';

type ProjectPageProps = {
  params: Promise<{
    projectSlug: string;
    screenshotSlug?: string[];
  }>;
};

export function generateStaticParams() {
  return portfolioProjects.flatMap((project) => [
    { projectSlug: project.slug, screenshotSlug: [] },
    ...project.screenshots.map((screenshot) => ({
      projectSlug: project.slug,
      screenshotSlug: [screenshot.slug],
    })),
  ]);
}

export async function generateMetadata({ params }: ProjectPageProps) {
  const { projectSlug, screenshotSlug = [] } = await params;
  const project = getPortfolioProject(projectSlug);

  if (!project || screenshotSlug.length > 1) {
    return {};
  }

  const screenshot =
    screenshotSlug.length === 1
      ? getPortfolioScreenshot(project, screenshotSlug[0])
      : undefined;

  return {
    title: screenshot
      ? `${project.title}: ${screenshot.slug} | Aaron M. Wright`
      : `${project.title} | Aaron M. Wright`,
    description: project.descriptionMarkdown.trim().split('\n')[0],
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectSlug, screenshotSlug = [] } = await params;
  const project = getPortfolioProject(projectSlug);

  if (!project || screenshotSlug.length > 1) {
    notFound();
  }

  const screenshot =
    screenshotSlug.length === 1
      ? getPortfolioScreenshot(project, screenshotSlug[0])
      : undefined;

  if (screenshotSlug.length === 1 && !screenshot) {
    notFound();
  }

  return (
    <Suspense>
      <PortfolioBrowser
        initialProjectSlug={project.slug}
        initialScreenshotSlug={screenshot?.slug}
      />
    </Suspense>
  );
}
