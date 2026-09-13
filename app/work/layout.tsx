import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { TOP_SCREEN_COLOR } from '@/components/portfolio/domain/theme'
import { PortfolioThemeProvider } from '@/components/portfolio/PortfolioThemeProvider'
import { PORTFOLIO_THEME_BOOTSTRAP_SCRIPT } from '@/components/portfolio/themeBootstrap'
import { faviconDataUrl } from '@/lib/favicon'
import { portfolioFont } from '@/lib/portfolioFonts'

export const metadata: Metadata = {
  title: 'Work | Aaron M. Wright',
  description: 'A viewport-sized portfolio browser for Aaron M. Wright.',
  icons: { icon: faviconDataUrl(TOP_SCREEN_COLOR) },
}

const TypographyPanel =
  process.env.NODE_ENV === 'development'
    ? dynamic(() => import('@/components/portfolio/dev/TypographyPanel'))
    : null

export default function WorkLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: PORTFOLIO_THEME_BOOTSTRAP_SCRIPT,
        }}
      />
      <PortfolioThemeProvider>
        <section
          className={`${portfolioFont.className} ${portfolioFont.variable} portfolio-theme-root portfolio-typography`}
          data-portfolio-theme-root
        >
          {children}
        </section>
      </PortfolioThemeProvider>
      {TypographyPanel ? <TypographyPanel /> : null}
    </>
  )
}
