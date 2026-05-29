import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['300', '800'],
});

export const metadata: Metadata = {
  title: 'Work | Aaron M. Wright',
  description: 'A viewport-sized portfolio browser for Aaron M. Wright.',
};

export default function WorkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <section className={openSans.className}>{children}</section>;
}
