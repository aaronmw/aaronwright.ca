import { PortfolioThemeProvider } from '@/components/portfolio/PortfolioThemeProvider'
import { PORTFOLIO_THEME_BOOTSTRAP_SCRIPT } from '@/components/portfolio/themeBootstrap'
import { portfolioFont } from '@/lib/portfolioFonts'

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
    </>
  )
}
