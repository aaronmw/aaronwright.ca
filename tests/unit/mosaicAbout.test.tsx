import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { MosaicAbout } from '@/components/mosaic/MosaicAbout'
import { mosaicProjects } from '@/lib/mosaic'
import { getPortfolioProject } from '@/lib/portfolio'
import { aboutPortrait } from '@/lib/aboutPortrait'
import { mosaicAboutCopy } from '@/lib/mosaicAboutCopy'

vi.mock('@/lib/mosaicFonts', () => ({
  mosaicAboutFont: { className: 'ubuntu-sans' },
}))

describe('expanded About Me', () => {
  it('uses the grid biography without changing the published copy', () => {
    const project = mosaicProjects.find(item => item.slug === 'about-me')!
    const original = getPortfolioProject('about-me')!
    expect(project.about).toEqual(mosaicAboutCopy)
    expect(project.about?.overviewMarkdown).not.toBe(original.overviewMarkdown)
    expect(original.overviewMarkdown).toContain(
      'I’m a product designer and frontend engineer',
    )
    const markup = renderToStaticMarkup(<MosaicAbout project={project} />)
    expect(project.media[0].src).toBe(aboutPortrait.src)
    expect(markup).toContain(`src="${aboutPortrait.src}"`)
    expect(markup).toContain(`src="${aboutPortrait.hoverSrc}"`)
    expect(markup).toContain('data-mosaic-about-portrait')
    expect(markup).toContain('aria-label="Biography"')
    const content = markup.replaceAll('\u00a0', ' ')
    expect(content).toContain('Aaron M. Wright')
    expect(content).toContain('I design and build interfaces')
    expect(content).toContain('to empower and delight humans.')
    expect(content).toContain('candid critique')
    expect(content).toContain('<strong>Informal Systems</strong>')
    expect(markup.match(/<p>/g)).toHaveLength(3)
    expect(markup).not.toContain('<li>')
    expect(markup).not.toContain('Working style and strengths')
  })

  it('keeps ordinary projects on their media-only viewer path', () => {
    const ordinary = mosaicProjects.filter(
      project => project.slug !== 'about-me',
    )
    expect(ordinary.every(project => project.about === undefined)).toBe(true)
    expect(renderToStaticMarkup(<MosaicAbout project={ordinary[0]} />)).toBe('')
  })

  it('places the three contact destinations after the biography with matching icons', () => {
    const project = mosaicProjects.find(item => item.slug === 'about-me')!
    const markup = renderToStaticMarkup(<MosaicAbout project={project} />)
    const footer = markup.slice(markup.indexOf('<footer'))
    expect(markup.indexOf('<footer')).toBeGreaterThan(markup.lastIndexOf('</p>'))
    const links = footer.match(/<a\b[^>]*>[\s\S]*?<\/a>/g)!
    expect(links).toHaveLength(3)
    for (const [index, href, label, icon] of [
      [0, 'https://www.linkedin.com/in/aaron-m-wright', 'LinkedIn', 'linkedin'],
      [1, 'https://www.figma.com/@aaronmw', 'Figma Community', 'figma'],
    ] as const) {
      expect(links[index]).toContain(`href="${href}"`)
      expect(links[index]).toContain(label)
      expect(links[index]).toContain(`fa-brands fa-${icon}`)
      expect(links[index]).toContain('target="_blank"')
      expect(links[index]).toContain('rel="noopener noreferrer"')
      expect(links[index]).toContain('(opens in a new tab)')
    }
    expect(links[2]).toContain('href="mailto:aaron@aaronwright.ca"')
    expect(links[2]).toContain('Email me')
    expect(links[2]).toContain('fa-sharp fa-solid fa-envelope')
    expect(links[2]).not.toContain('target=')
    expect(links[2]).not.toContain('opens in a new tab')
  })
})
