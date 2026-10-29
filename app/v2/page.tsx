import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { legacyMosaicRedirectUrl } from '@/components/mosaic/routing'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function LegacyMosaicPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  redirect(legacyMosaicRedirectUrl(await searchParams))
}
