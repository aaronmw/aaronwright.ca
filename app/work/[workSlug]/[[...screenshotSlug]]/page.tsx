import { notFound, permanentRedirect } from 'next/navigation'
import {
  canonicalMosaicSlug,
  findMosaicProject,
  hasViewerParameters,
  mosaicSearchParams,
  mosaicUrl,
  type MosaicSearchParams,
} from '@/components/mosaic/routing'
import { mosaicProjects } from '@/lib/mosaic'
import { getPortfolioMetadata } from '@/lib/seo'

type ProjectPageProps = {
  params: Promise<{ workSlug: string; screenshotSlug?: string[] }>
  searchParams: Promise<MosaicSearchParams>
}

export async function generateMetadata({ params }: ProjectPageProps) {
  const { workSlug, screenshotSlug = [] } = await params
  const path = [workSlug, ...screenshotSlug].map(encodeURIComponent).join('/')
  const metadata = getPortfolioMetadata(`/work/${path}`)
  if (!metadata) notFound()
  return metadata
}

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const [{ workSlug, screenshotSlug = [] }, search] = await Promise.all([
    params,
    searchParams,
  ])
  const project = findMosaicProject(workSlug, mosaicProjects)
  const path = [workSlug, ...screenshotSlug].map(encodeURIComponent).join('/')
  if (!project || !getPortfolioMetadata(`/work/${path}`)) notFound()
  if (
    screenshotSlug.length ||
    workSlug !== canonicalMosaicSlug(project.slug) ||
    hasViewerParameters(search)
  ) {
    permanentRedirect(mosaicUrl('/work', project, mosaicSearchParams(search)))
  }
  return null
}
