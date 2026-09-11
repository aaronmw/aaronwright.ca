import type { CSSProperties } from 'react'

// Geometry shared by CSS layout and navigation calculations.
export const portfolioGeometry = {
  strokePx: 6,
  controlSizeRem: 2.75,
  navigationSlotPx: 52,
} as const

// Milliseconds are the source of truth. Keep distinct animation roles tunable.
export const portfolioMotion = {
  feedback: 150,
  menuHover: 140,
  menu: 160,
  link: 160,
  theme: 180,
  state: 200,
  navigation: 300,
  navigationPreviewDelay: 300,
  navigationPreviewDraw: 250,
  narrative: 280,
  reduced: 120,
  identity: 300,
  helper: 300,
  loading: 300,
  backdropEnter: 450,
  backdropExit: 150,
  mediaFilter: 1000,
  mediaPadding: 500,
  thumbnail: 500,
  descriptionDelay: 500,
  pending: 800,
  scroll: 600,
  viewerTransform: 360,
  viewerChrome: 240,
  viewerFade: 120,
  viewerControlsEnter: 140,
  viewerControlsReducedEnter: 100,
  viewerControlsEnterDelay: 140,
  viewerControlsExit: 120,
  viewerControlsReducedExit: 80,
  viewerSwipe: 260,
  viewerNavigation: 220,
  viewerZoom: 180,
} as const

// These values retain the existing order within each element's stacking context.
export const portfolioLayers = {
  cardMedia: -20,
  cardShade: -10,
  scrim: -10,
  viewerControls: 1,
  content: 10,
  focusedControl: 15,
  overlay: 20,
  mediaControls: 30,
  compactIdentity: 35,
  navigation: 40,
  identity: 45,
  frame: 50,
  appearance: 65,
  loading: 100,
  helper: 110,
  viewer: 9999,
  // Match React Aria's existing portal layer, overriding its inline default.
  menu: 100000,
  tooltip: 100000,
} as const

export const portfolioMotionSeconds = Object.fromEntries(
  Object.entries(portfolioMotion).map(([name, milliseconds]) => [
    name,
    milliseconds / 1000,
  ]),
) as Record<keyof typeof portfolioMotion, number>

function tokenName(name: string) {
  return name.replace(/[A-Z]/g, character => `-${character.toLowerCase()}`)
}

// Render once on <html>; portals inherit the same tokens as the main portfolio.
export const portfolioTokenStyle = {
  '--logo-stroke-width': `${portfolioGeometry.strokePx}px`,
  '--portfolio-control-size': `${portfolioGeometry.controlSizeRem}rem`,
  '--portfolio-navigation-content-size': `${portfolioGeometry.navigationSlotPx}px`,
  ...Object.fromEntries(
    Object.entries(portfolioMotion).map(([name, milliseconds]) => [
      `--portfolio-motion-${tokenName(name)}`,
      `${milliseconds}ms`,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(portfolioLayers).map(([name, layer]) => [
      `--portfolio-layer-${tokenName(name)}`,
      layer,
    ]),
  ),
} as CSSProperties
