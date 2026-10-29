import { describe, expect, it } from 'vitest'
import { getPortfolioProject, portfolioSlides } from '@/lib/portfolio'
import { mosaicProjects } from '@/lib/mosaic'

describe('staged grid portfolio isolation', () => {
  it('preserves published project slugs while the grid uses its new identifiers', () => {
    expect(portfolioSlides.map(project => project.slug)).toContain('nextphrase')
    expect(getPortfolioProject('nextphrase-dot-app')).toBeUndefined()
    expect(
      mosaicProjects.find(project => project.slug === 'nextphrase-dot-app'),
    ).toMatchObject({ id: 'nextphrase-dot-app' })
    expect(portfolioSlides).toHaveLength(6)
    expect(mosaicProjects).toHaveLength(10)
  })

  it('uses distinct video URLs and dimensions without changing the legacy clips', () => {
    const original = getPortfolioProject('informal-systems')!.screenshots[0]
    const grid = mosaicProjects.find(
      project => project.slug === 'informal-systems',
    )!.media[0]
    expect(original).toMatchObject({
      src: '/portfolio/informal-systems/walkthrough.mp4',
      width: 1544,
      height: 1064,
      clip: { kind: 'rounded', radiusX: 28 / 1544, radiusY: 28 / 1064 },
    })
    expect(grid).toMatchObject({
      src: '/portfolio/mosaic/informal-systems-walkthrough.mp4',
      width: 1920,
      height: 1080,
    })
    expect(grid.clip).toBeUndefined()
    expect(getPortfolioProject('nextphrase')!.screenshots[0].src).toBe(
      '/portfolio/nextphrase/intro-video.webm',
    )
    expect(
      mosaicProjects.find(project => project.slug === 'nextphrase-dot-app')!
        .media[0].src,
    ).toBe('/portfolio/nextphrase-dot-app/intro-video.webm')
  })
})
