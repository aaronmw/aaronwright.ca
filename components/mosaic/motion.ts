import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { MOSAIC_ENTRANCE_EASING } from './entrance'

gsap.registerPlugin(CustomEase)

export { gsap }
export const seconds = (milliseconds: number) => milliseconds / 1000
export const mosaicEase = {
  travel: CustomEase.create('mosaic-travel', MOSAIC_ENTRANCE_EASING.travel),
  corners: CustomEase.create('mosaic-corners', MOSAIC_ENTRANCE_EASING.corners),
  viewer: CustomEase.create('mosaic-viewer', '0.33 1 0.68 1'),
  fade: CustomEase.create('mosaic-fade', '0 0 0.58 1'),
}
