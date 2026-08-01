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
  searchParams: Promise<{
    modal?: string;
  }>;
};

function plainTextFromMarkdown(markdown: string) {
  return markdown
    .trim()
    .split('\n')[0]
    .replace(/!?\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
    description: plainTextFromMarkdown(project.descriptionMarkdown),
  };
}

export default async function SlidePage({ params, searchParams }: SlidePageProps) {
  const [{ workSlug, screenshotSlug = [] }, { modal }] = await Promise.all([
    params,
    searchParams,
  ]);
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
        initialModalOpen={modal === 'image' && Boolean(screenshot)}
      />
    </Suspense>
  );
}
