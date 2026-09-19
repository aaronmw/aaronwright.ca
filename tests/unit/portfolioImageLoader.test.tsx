import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createFiveByFiveRevealOrder } from '../../components/portfolio/presentation/FiveByFive'
import { PortfolioImageLoader } from '../../components/portfolio/presentation/PortfolioImageLoader'
import { ScreenshotMedia } from '../../components/portfolio/presentation/PortfolioMedia'

describe('FiveByFive image loading', () => {
  it('fills one additional, distinct square at each 4% threshold', () => {
    const order = createFiveByFiveRevealOrder(() => 0.37)
    expect(new Set(order).size).toBe(25)
    expect([...order].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 25 }, (_, index) => index),
    )
    expect(order).not.toEqual([...order].sort((a, b) => a - b))
    let previous: number[] = []
    for (let loaded = 0; loaded <= 100; loaded++) {
      const html = renderToStaticMarkup(
        <PortfolioImageLoader
          progress={{ loaded, total: 100, failed: 0 }}
          revealOrder={order}
        />,
      )
      const filled = Array.from(
        html.matchAll(/<span class="(bg-current|bg-portfolio-shaded)"/g),
      ).flatMap((match, index) => (match[1] === 'bg-current' ? [index] : []))
      expect(html.replace(/<[^>]+>/g, '')).toBe('')
      expect(filled).toHaveLength(Math.floor(loaded / 4))
      expect(previous.every(index => filled.includes(index))).toBe(true)
      previous = filled
    }
  })

  it('does not count a failed image as loaded', () => {
    const html = renderToStaticMarkup(
      <PortfolioImageLoader
        progress={{ loaded: 24, total: 25, failed: 1 }}
        revealOrder={createFiveByFiveRevealOrder(() => 0)}
      />,
    )
    expect(html).toContain('data-filled-cells="24"')
    expect(html).toContain('1 could not load')
  })

  it('leaves background images to the preload queue rather than the browser preload scanner', () => {
    const html = renderToStaticMarkup(
      <ScreenshotMedia
        screenshot={{
          id: 'image',
          slug: 'image',
          src: '/example.png',
          alt: 'Example image',
        }}
        mediaKey="carousel:image"
        registerMediaElement={() => {}}
        playbackActive={false}
        sizes="100vw"
        className=""
        action={{ label: 'Open image', onClick: () => {} }}
      />,
    )
    const image = html.match(/<img\b[^>]*>/)?.[0]
    expect(image).toBeDefined()
    expect(image).toContain('data-portfolio-image-src="/example.png"')
    expect(image).not.toMatch(/\ssrc=/)
    expect(html).not.toContain('rel="preload"')
  })

  it('renders an inactive video without a fetchable source, even if marked priority', () => {
    const html = renderToStaticMarkup(
      <ScreenshotMedia
        screenshot={{
          id: 'video',
          slug: 'video',
          src: '/example.mp4',
          alt: 'Example video',
        }}
        mediaKey="carousel:video"
        registerMediaElement={() => {}}
        playbackActive={false}
        priority
        sizes="100vw"
        className=""
        action={{ label: 'Open video', onClick: () => {} }}
      />,
    )
    const video = html.match(/<video\b[^>]*>/)?.[0]
    expect(video).toBeDefined()
    expect(video).toContain('data-portfolio-video-src="/example.mp4"')
    expect(video).toContain('preload="none"')
    expect(video).not.toMatch(/\ssrc=/)
    expect(video).not.toContain('autoPlay')
  })
})
