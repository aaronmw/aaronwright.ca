import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  PortfolioFrameProgress,
  PortfolioImageProgressProvider,
} from '../../components/portfolio/presentation/PortfolioFrameProgress'
import { ScreenshotMedia } from '../../components/portfolio/presentation/PortfolioMedia'
import { PortfolioStartupLoader } from '../../components/portfolio/presentation/PortfolioStartupLoader'

describe('portfolio startup loader', () => {
  it('renders a text-free six-square snake before hydration and disappears when ready', () => {
    const html = renderToStaticMarkup(
      <PortfolioStartupLoader phase="loading" />,
    )
    expect(html.replace(/<[^>]+>/g, '')).toBe('')
    expect(html).toContain('data-five-by-five="snake"')
    expect(html.match(/opacity-100/g)).toHaveLength(6)
    expect(html.match(/motion-safe:animate-portfolio-snake/g)).toHaveLength(16)
    expect(renderToStaticMarkup(<PortfolioStartupLoader phase="ready" />)).toBe(
      '',
    )
  })
})

describe('portfolio frame image progress', () => {
  it('fills both frame bars together without visible text', () => {
    for (const loaded of [0, 4, 8, 16]) {
      const html = renderToStaticMarkup(
        <PortfolioImageProgressProvider
          progress={{ loaded, total: 16, failed: 0 }}
        >
          <PortfolioFrameProgress />
        </PortfolioImageProgressProvider>,
      )
      expect(html.replace(/<[^>]+>/g, '')).toBe('')
      expect(html).toContain('data-portfolio-top-rule="true"')
      expect(html).toContain('data-portfolio-bottom-rule="true"')
      expect(html.match(/scaleX\([^)]+\)/g)).toEqual([
        `scaleX(${loaded / 16})`,
        `scaleX(${loaded / 16})`,
      ])
      expect(html.match(/role="progressbar"/g)).toHaveLength(1)
      expect(html).toContain(`aria-valuenow="${loaded}"`)
      expect(html).not.toContain('data-five-by-five')
    }
  })

  it('keeps failed images unfilled and exposes their status without visible text', () => {
    const html = renderToStaticMarkup(
      <PortfolioImageProgressProvider
        progress={{ loaded: 15, total: 16, failed: 1 }}
      >
        <PortfolioFrameProgress />
      </PortfolioImageProgressProvider>,
    )
    expect(html.match(/scaleX\([^)]+\)/g)).toEqual([
      'scaleX(0.9375)',
      'scaleX(0.9375)',
    ])
    expect(html).toContain('1 could not load')
    expect(html.replace(/<[^>]+>/g, '')).toBe('')
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
