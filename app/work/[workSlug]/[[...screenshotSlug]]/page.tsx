import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { PortfolioBrowser } from '@/components/portfolio/PortfolioBrowser';
import {
  getPortfolioProject,
  getPortfolioScreenshot,
  portfolioSlides,
} from '@/lib/portfolio';

type SlidePageProps = {
  params: Promise<{
    workSlug: string;
    screenshotSlug?: string[];
  }>;
};

export function generateStaticParams() {
  return portfolioSlides.flatMap((project) => [
    { workSlug: project.slug, screenshotSlug: [] },
    ...project.screenshots.map((screenshot) => ({
      workSlug: project.slug,
      screenshotSlug: [screenshot.slug],
    })),
  ]);
}

export async function generateMetadata({ params }: SlidePageProps) {
  const { workSlug, screenshotSlug = [] } = await params;
  const project = getPortfolioProject(workSlug);

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

export default async function SlidePage({ params }: SlidePageProps) {
  const { workSlug, screenshotSlug = [] } = await params;
  const project = getPortfolioProject(workSlug);

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
