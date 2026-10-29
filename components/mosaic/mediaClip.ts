import type { PortfolioMediaClip } from '@/lib/portfolio'
import { PHONE_FRAME_PATH, PHONE_FRAME_PATH_SCALE } from '@/lib/phoneFrame'

/** Reuse the portfolio's source-relative outline at every rendered size. */
export function mediaMask(clip?: PortfolioMediaClip): string {
  if (!clip) return 'none'
  const shape =
    clip.kind === 'phone'
      ? `<path d="${PHONE_FRAME_PATH}" transform="${PHONE_FRAME_PATH_SCALE}"/>`
      : `<rect width="1" height="1" rx="${clip.radiusX}" ry="${clip.radiusY}"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" preserveAspectRatio="none">${shape}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
