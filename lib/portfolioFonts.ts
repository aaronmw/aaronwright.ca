import { IBM_Plex_Mono } from 'next/font/google'

export const portfolioFont = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-ibm-plex-mono',
})
