import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';
import { TOP_SCREEN_COLOR } from '@/components/portfolio/domain/theme';
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
  return <section className={openSans.className}>{children}</section>;
}
