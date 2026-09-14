import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { ShareCard } from '@/components/seo/ShareCard'
import { SHARE_IMAGE_SIZE } from './seo'
import { getShareCard } from './shareCards'
import { phoneFrameSvg } from './phoneFrame'

// Shared local assets are read once per build worker; no network or browser is involved.
const assets = Promise.all([
  readFile(join(process.cwd(), 'assets/fonts/IBMPlexMono-Regular.ttf')),
  readFile(join(process.cwd(), 'assets/fonts/IBMPlexMono-Bold.ttf')),
  readFile(join(process.cwd(), 'public/favicon.svg'), 'base64'),
])

export async function renderShareCard(slug: string) {
  const card = getShareCard(slug)
  if (!card) return new Response('Not found', { status: 404 })
  const [[regular, bold, logo], artwork] = await Promise.all([
    assets,
    card.artwork?.load(),
  ])
  const pngSource = artwork ? `data:image/png;base64,${artwork}` : undefined
  const artworkSource = pngSource && card.artwork?.clipToPhoneFrame
    ? `data:image/svg+xml;base64,${Buffer.from(phoneFrameSvg(pngSource)).toString('base64')}`
    : pngSource

  return new ImageResponse(
    <ShareCard
      card={card}
      logo={`data:image/svg+xml;base64,${logo}`}
      artwork={artworkSource}
    />,
    {
      ...SHARE_IMAGE_SIZE,
      fonts: [
        { name: 'IBM Plex Mono', data: regular, weight: 400, style: 'normal' },
        { name: 'IBM Plex Mono', data: bold, weight: 700, style: 'normal' },
      ],
    },
  )
}
