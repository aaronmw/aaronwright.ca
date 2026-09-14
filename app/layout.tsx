import '@/styles/globals.css';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { FaviconSync } from '@/components/FaviconSync';
import { InteractivePopEffects } from '@/components/InteractivePopEffects';
import { config } from '@fortawesome/fontawesome-svg-core';
import type { Metadata, Viewport } from 'next';
import { HOME_SEO, SITE_URL } from '@/lib/siteMetadata';
import { portfolioPaletteStyle } from '@/lib/portfolioPalette';
import { portfolioTokenStyle } from '@/lib/portfolioTokens';

config.autoAddCss = false;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...HOME_SEO,
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
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
