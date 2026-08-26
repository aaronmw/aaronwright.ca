import { Courier_Prime, Open_Sans } from 'next/font/google'

export const portfolioFont = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-courier-prime',
})

export const portfolioControlsFont = Open_Sans({
  subsets: ['latin'],
  weight: ['300', '500', '800'],
  variable: '--font-open-sans',
})
