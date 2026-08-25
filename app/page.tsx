import type { Metadata } from 'next';
import { HomeProjectGrid } from '@/components/HomeProjectGrid';

export const metadata: Metadata = {
  title: 'Aaron M. Wright',
  description:
    'Selected product design and frontend systems work by Aaron M. Wright.',
};

export default function Home() {
  return <HomeProjectGrid />;
}
