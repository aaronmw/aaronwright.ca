import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
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
