import { notFound, permanentRedirect } from 'next/navigation'
import {
  hasViewerParameters,
  legacyMosaicRedirectUrl,
  type MosaicSearchParams,
} from '@/components/mosaic/routing'
import { mosaicProjects } from '@/lib/mosaic'
import { getPortfolioMetadata } from '@/lib/seo'

export const metadata = getPortfolioMetadata('/work')

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<MosaicSearchParams>
}) {
  const search = await searchParams
  if (hasViewerParameters(search)) {
    const target = legacyMosaicRedirectUrl(search, mosaicProjects)
    if (!target) notFound()
    permanentRedirect(target)
  }
  return null
}
