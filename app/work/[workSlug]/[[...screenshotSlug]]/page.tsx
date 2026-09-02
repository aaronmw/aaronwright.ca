import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { PortfolioBrowser } from '@/components/portfolio/PortfolioBrowser'
import { getProjectColorBySlug } from '@/components/portfolio/domain/portfolioColors'
import { TOP_SCREEN_COLOR } from '@/components/portfolio/domain/theme'
import { faviconDataUrl } from '@/lib/favicon'
import {
  getPortfolioProject,
  getPortfolioScreenshot,
  portfolioSlides,
} from '@/lib/portfolio'
import { parsePortfolioNarrative } from '@/lib/portfolioNarrative'

type SlidePageProps = {
  params: Promise<{
    workSlug: string
    screenshotSlug?: string[]
  }>
  searchParams: Promise<{
    modal?: string
    zoom?: string
  }>
}

function plainTextFromMarkdown(markdown: string) {
  return markdown
    .trim()
    .split('\n')[0]
    .replace(/!?\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function generateStaticParams() {
  return portfolioSlides.flatMap(project => [
    { workSlug: project.slug, screenshotSlug: [] },
    ...(project.cover_image
      ? [
          {
            workSlug: project.slug,
            screenshotSlug: [project.cover_image.slug],
          },
        ]
      : []),
    ...project.screenshots.map(screenshot => ({
      workSlug: project.slug,
      screenshotSlug: [screenshot.slug],
    })),
  ])
}

export async function generateMetadata({ params }: SlidePageProps) {
  const { workSlug, screenshotSlug = [] } = await params
  const project = getPortfolioProject(workSlug)

  if (!project || screenshotSlug.length > 1) {
    return {}
  }

  const screenshot =
    screenshotSlug.length === 1
      ? getPortfolioScreenshot(project, screenshotSlug[0])
      : undefined

  return {
    title: screenshot
      ? `${project.title}: ${screenshot.slug} | Aaron M. Wright`
      : `${project.title} | Aaron M. Wright`,
    description: plainTextFromMarkdown(
      parsePortfolioNarrative(project.overviewMarkdown).bodyMarkdown,
    ),
    icons: {
      icon: faviconDataUrl(
        getProjectColorBySlug(project.slug) ?? TOP_SCREEN_COLOR,
      ),
    },
  }
}

export default async function SlidePage({
  params,
  searchParams,
}: SlidePageProps) {
  const [{ workSlug, screenshotSlug = [] }, { modal, zoom }] =
    await Promise.all([params, searchParams])
  const project = getPortfolioProject(workSlug)

  if (!project || screenshotSlug.length > 1) {
    notFound()
  }

  if (project.slug === 'about-me' && screenshotSlug[0] === 'overview') {
    redirect('/work/about-me')
  }

  const screenshot =
    screenshotSlug.length === 1
      ? getPortfolioScreenshot(project, screenshotSlug[0])
      : undefined

  if (screenshotSlug.length === 1 && !screenshot) {
    notFound()
  }

  const viewerMedia =
    screenshot ??
    (screenshotSlug.length === 0 ? project.cover_image : undefined)

  return (
    <Suspense>
      <PortfolioBrowser
        initialProjectSlug={project.slug}
        initialScreenshotSlug={screenshot?.slug}
        initialViewerOpen={
          (modal === 'image' || zoom === 'image') && Boolean(viewerMedia)
        }
      />
    </Suspense>
  )
}
