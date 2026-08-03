import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';
import { TOP_SCREEN_COLOR } from '@/components/portfolio/domain/theme';
import { PortfolioThemeProvider } from '@/components/portfolio/PortfolioThemeProvider';
import { PORTFOLIO_THEME_BOOTSTRAP_SCRIPT } from '@/components/portfolio/themeBootstrap';
import { faviconDataUrl } from '@/lib/favicon';

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['300', '500', '800'],
});

export const metadata: Metadata = {
  title: 'Work | Aaron M. Wright',
  description: 'A viewport-sized portfolio browser for Aaron M. Wright.',
  icons: { icon: faviconDataUrl(TOP_SCREEN_COLOR) },
};

export default function WorkLayout({
  children,
}: {
  children: React.ReactNode;
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
          className={`${openSans.className} portfolio-theme-root`}
          data-portfolio-theme-root
        >
          {children}
        </section>
      </PortfolioThemeProvider>
    </>
  );
}
