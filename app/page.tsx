import type { Metadata } from 'next';
import { HomeLogo } from '@/components/HomeLogo';

export const metadata: Metadata = {
  title: 'Aaron M. Wright',
  description: 'Aaron M. Wright',
};

export default function Home() {
  return <HomeLogo />;
}
