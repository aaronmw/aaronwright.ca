import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { PortfolioBrowser } from '@/components/portfolio/PortfolioBrowser'
import { getProjectSlides } from '@/components/portfolio/domain/slides'
import { getPortfolioProject, portfolioSlides } from '@/lib/portfolio'
import { getPortfolioMetadata } from '@/lib/seo'

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
    ...getProjectSlides(project)
      .filter(slide => slide.kind === 'details')
      .map(slide => ({ workSlug: project.slug, screenshotSlug: [slide.slug] })),
  ])
}

export async function generateMetadata({ params }: SlidePageProps) {
  const { workSlug, screenshotSlug = [] } = await params
  if (
    workSlug === 'about-me' &&
    screenshotSlug.length === 1 &&
    screenshotSlug[0] === 'overview'
  ) {
    redirect('/work/about-me')
  }
  const path = [workSlug, ...screenshotSlug].map(encodeURIComponent).join('/')
  const metadata = getPortfolioMetadata(`/work/${path}`)
  if (!metadata) notFound()
  return metadata
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

  const slide =
    screenshotSlug.length === 1
      ? getProjectSlides(project).find(
          slide => slide.kind !== 'description' && slide.slug === screenshotSlug[0],
        )
      : undefined

  if (screenshotSlug.length === 1 && !slide) {
    notFound()
  }

  const viewerMedia =
    (slide?.kind === 'screenshot' ? slide.screenshot : undefined) ??
    (screenshotSlug.length === 0 ? project.cover_image : undefined)

  return (
    <Suspense>
      <PortfolioBrowser
        initialProjectSlug={project.slug}
        initialScreenshotSlug={slide?.slug}
        initialViewerOpen={
          (modal === 'image' || zoom === 'image') && Boolean(viewerMedia)
        }
      />
    </Suspense>
  )
}
