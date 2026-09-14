import { renderShareCard } from '@/lib/renderShareCard'
import { SHARE_IMAGE_SLUGS } from '@/lib/seo'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return SHARE_IMAGE_SLUGS.map(slug => ({ slug }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  return renderShareCard((await params).slug)
}
