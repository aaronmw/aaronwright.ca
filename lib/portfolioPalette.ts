import type { CSSProperties } from 'react'
import colors from 'tailwindcss/colors'

// Change this selection to switch every portfolio neutral, including favicons.
export const portfolioNeutralPalette = colors.stone
export const portfolioAccentColor = colors.red[600]

// Rendered on <html> so portaled menus and the viewer share the same palette.
export const portfolioPaletteStyle = {
  '--portfolio-accent-decoration': portfolioAccentColor,
  '--portfolio-red-500': colors.red[500],
  '--portfolio-red-600': colors.red[600],
  '--portfolio-neutral-50': portfolioNeutralPalette[50],
  '--portfolio-neutral-200': portfolioNeutralPalette[200],
  '--portfolio-neutral-300': portfolioNeutralPalette[300],
  '--portfolio-neutral-400': portfolioNeutralPalette[400],
  '--portfolio-neutral-500': portfolioNeutralPalette[500],
  '--portfolio-neutral-600': portfolioNeutralPalette[600],
  '--portfolio-neutral-700': portfolioNeutralPalette[700],
  '--portfolio-neutral-800': portfolioNeutralPalette[800],
  '--portfolio-neutral-950': portfolioNeutralPalette[950],
} as CSSProperties
