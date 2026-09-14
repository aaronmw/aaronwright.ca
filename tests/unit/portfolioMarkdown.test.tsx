import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getPortfolioProject, portfolioSlides } from '../../lib/portfolio'
import {
  PortfolioInlineMarkdown,
  PortfolioMarkdown,
} from '../../components/portfolio/presentation/PortfolioText'

describe('portfolio Markdown sanitization', () => {
  it('preserves generated abbreviation titles', () => {
    const markup = renderToStaticMarkup(
      <PortfolioInlineMarkdown>
        {'<abbr title="User experience">UX</abbr>'}
      </PortfolioInlineMarkdown>,
    )

    expect(markup).toContain('<abbr title="User experience">UX</abbr>')
  })

  it('renders the NextPhrase abbreviation from the actual project copy', () => {
    const markup = renderToStaticMarkup(
      <PortfolioMarkdown>
        {getPortfolioProject('nextphrase')!.overviewMarkdown}
      </PortfolioMarkdown>,
    )

    expect(markup).toContain('<abbr title="Progressive Web App">PWA</abbr>')
  })

  it('expands newer acronyms throughout the portfolio copy', () => {
    const markup = portfolioSlides
      .flatMap(project => [
        project.overviewMarkdown,
        ...project.screenshots.map(screenshot => screenshot.description ?? ''),
      ])
      .map(markdown => renderToStaticMarkup(
        <PortfolioMarkdown>{markdown}</PortfolioMarkdown>,
      ))
      .join('')

    for (const [acronym, expansion] of [
      ['GIFs', 'Graphics Interchange Format images'],
      ['HTML', 'Hypertext Markup Language'],
      ['ID', 'Identifier'],
      ['RFP', 'Request for Proposal'],
      ['WYSIWYG', 'What You See Is What You Get'],
    ]) {
      expect(markup).toContain(`<abbr title="${expansion}">${acronym}</abbr>`)
    }
    expect(markup).not.toContain('>LEGO</abbr>')
    expect(markup).not.toContain('>LOT</abbr>')
  })

  it('removes executable raw HTML', () => {
    const markup = renderToStaticMarkup(
      <PortfolioMarkdown>
        {'Safe <script>alert(1)</script><span onclick="alert(2)">copy</span>'}
      </PortfolioMarkdown>,
    )

    expect(markup).not.toContain('<script')
    expect(markup).not.toContain('onclick')
    expect(markup).toContain('Safe')
    expect(markup).toContain('copy')
  })
})
