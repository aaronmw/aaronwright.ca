import '@/styles/globals.css';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { FaviconSync } from '@/components/FaviconSync';
import { InteractivePopEffects } from '@/components/InteractivePopEffects';
import { config } from '@fortawesome/fontawesome-svg-core';
import type { Viewport } from 'next';
import { portfolioPaletteStyle } from '@/lib/portfolioPalette';
import { portfolioTokenStyle } from '@/lib/portfolioTokens';
import { faviconDataUrl } from '@/lib/favicon';

config.autoAddCss = false;

export const metadata = {
  title: 'Aaron M. Wright',
  description: 'Aaron M. Wright',
  icons: { icon: faviconDataUrl() },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      style={{ ...portfolioPaletteStyle, ...portfolioTokenStyle }}
      suppressHydrationWarning
    >
      <body>
        {children}
        <FaviconSync />
        <InteractivePopEffects />
      </body>
    </html>
  );
}
