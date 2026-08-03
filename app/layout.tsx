import '@/styles/globals.css';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { FaviconSync } from '@/components/FaviconSync';
import { InteractivePopEffects } from '@/components/InteractivePopEffects';
import { config } from '@fortawesome/fontawesome-svg-core';
import type { Viewport } from 'next';

config.autoAddCss = false;

export const metadata = {
  title: 'Aaron M. Wright',
  description: 'Aaron M. Wright',
  icons: { icon: '/favicon.svg' },
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
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <FaviconSync />
        <InteractivePopEffects />
      </body>
    </html>
  );
}
