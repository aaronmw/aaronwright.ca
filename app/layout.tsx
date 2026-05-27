import '@/styles/globals.css';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { FaviconSync } from '@/components/FaviconSync';
import { config } from '@fortawesome/fontawesome-svg-core';

config.autoAddCss = false;

export const metadata = {
  title: 'Aaron M. Wright',
  description: 'Aaron M. Wright',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <FaviconSync />
      </body>
    </html>
  );
}
