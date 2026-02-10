import '@/styles/globals.css';
import { FaviconSync } from '@/components/FaviconSync';

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
