import { notFound, permanentRedirect } from 'next/navigation'
import {
  legacyMosaicRedirectUrl,
  type MosaicSearchParams,
} from '@/components/mosaic/routing'
import { mosaicProjects } from '@/lib/mosaic'

export default async function LegacyGridPage({
  searchParams,
}: {
  searchParams: Promise<MosaicSearchParams>
}) {
  const target = legacyMosaicRedirectUrl(await searchParams, mosaicProjects)
  if (!target) notFound()
  permanentRedirect(target)
}
