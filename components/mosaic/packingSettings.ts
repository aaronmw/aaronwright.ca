export type PackingApproach = 'justified' | 'rectangles'
export type PackingSettings = {
  approach: PackingApproach
  seed: number
  /** Maximum fractional departure from the source aspect ratio; omission is exact. */
  tolerance?: number
}

export const DEFAULT_PACKING_TOLERANCE = 0.1
export const MAX_PACKING_TOLERANCE = 0.3

export const DEFAULT_PACKING_SETTINGS: PackingSettings = {
  approach: 'rectangles',
  seed: 440300784,
}
