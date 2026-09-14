import dynamic from 'next/dynamic'
import { PortfolioThemeProvider } from '@/components/portfolio/PortfolioThemeProvider'
import { PORTFOLIO_THEME_BOOTSTRAP_SCRIPT } from '@/components/portfolio/themeBootstrap'
import { portfolioFont } from '@/lib/portfolioFonts'

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
