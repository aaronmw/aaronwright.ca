import type { PackingSettings } from './packing'
import { DEFAULT_PACKING_SETTINGS } from './packingSettings'
import type { MosaicOrientation, MosaicProject } from './types'

export type MosaicArrangement = {
  columns: number[]
  rows: number[]
  areas: string[][]
}
export type MosaicLayout = {
  packing?: PackingSettings
  projectAreas: Record<string, string>
  arrangements: Record<MosaicOrientation, MosaicArrangement>
}

export const balancedLayout: MosaicLayout = {
  packing: DEFAULT_PACKING_SETTINGS,
  projectAreas: {
    'about-me': 'p0',
    'loopio': 'p1',
    'freshbooks': 'p2',
    'cycles-dot-money': 'p3',
    'informal-systems': 'p4',
    'aarons-toolbox': 'p5',
    'nextphrase-dot-app': 'p6',
    'age-dot-fund': 'p7',
    'radio-app': 'p8',
    'gift-exchanges': 'p9',
  },
  arrangements: {
    landscape: {
      columns: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      rows: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      areas: [
        [
          'p0',
          'p0',
          'p0',
          'p0',
          'p0',
          'p6',
          'p6',
          'p1',
          'p1',
          'p5',
          'p5',
          'p5',
        ],
        [
          'p0',
          'p0',
          'p0',
          'p0',
          'p0',
          'p6',
          'p6',
          'p1',
          'p1',
          'p5',
          'p5',
          'p5',
        ],
        [
          'p0',
          'p0',
          'p0',
          'p0',
          'p0',
          'p6',
          'p6',
          'p1',
          'p1',
          'p5',
          'p5',
          'p5',
        ],
        [
          'p0',
          'p0',
          'p0',
          'p0',
          'p0',
          'p6',
          'p6',
          'p1',
          'p1',
          'p9',
          'p9',
          'p9',
        ],
        [
          'p0',
          'p0',
          'p0',
          'p0',
          'p0',
          'p6',
          'p6',
          'p1',
          'p1',
          'p9',
          'p9',
          'p9',
        ],
        [
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p6',
          'p6',
          'p1',
          'p1',
          'p9',
          'p9',
          'p9',
        ],
        [
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p6',
          'p6',
          'p1',
          'p1',
          'p2',
          'p2',
          'p2',
        ],
        [
          'p7',
          'p7',
          'p7',
          'p7',
          'p7',
          'p4',
          'p4',
          'p4',
          'p4',
          'p2',
          'p2',
          'p2',
        ],
        [
          'p7',
          'p7',
          'p7',
          'p7',
          'p7',
          'p4',
          'p4',
          'p4',
          'p4',
          'p2',
          'p2',
          'p2',
        ],
        [
          'p7',
          'p7',
          'p7',
          'p7',
          'p7',
          'p4',
          'p4',
          'p4',
          'p4',
          'p2',
          'p2',
          'p2',
        ],
        [
          'p8',
          'p8',
          'p8',
          'p8',
          'p8',
          'p4',
          'p4',
          'p4',
          'p4',
          'p2',
          'p2',
          'p2',
        ],
        [
          'p8',
          'p8',
          'p8',
          'p8',
          'p8',
          'p4',
          'p4',
          'p4',
          'p4',
          'p2',
          'p2',
          'p2',
        ],
      ],
    },
    portrait: {
      columns: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      rows: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      areas: [
        [
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
        ],
        [
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
          'p3',
        ],
        [
          'p5',
          'p5',
          'p5',
          'p5',
          'p5',
          'p5',
          'p9',
          'p9',
          'p9',
          'p9',
          'p9',
          'p9',
        ],
        [
          'p5',
          'p5',
          'p5',
          'p5',
          'p5',
          'p5',
          'p9',
          'p9',
          'p9',
          'p9',
          'p9',
          'p9',
        ],
        [
          'p5',
          'p5',
          'p5',
          'p5',
          'p5',
          'p5',
          'p9',
          'p9',
          'p9',
          'p9',
          'p9',
          'p9',
        ],
        [
          'p1',
          'p1',
          'p1',
          'p7',
          'p7',
          'p7',
          'p7',
          'p8',
          'p8',
          'p8',
          'p8',
          'p8',
        ],
        [
          'p1',
          'p1',
          'p1',
          'p7',
          'p7',
          'p7',
          'p7',
          'p8',
          'p8',
          'p8',
          'p8',
          'p8',
        ],
        [
          'p4',
          'p4',
          'p4',
          'p4',
          'p4',
          'p6',
          'p6',
          'p6',
          'p6',
          'p6',
          'p6',
          'p6',
        ],
        [
          'p4',
          'p4',
          'p4',
          'p4',
          'p4',
          'p6',
          'p6',
          'p6',
          'p6',
          'p6',
          'p6',
          'p6',
        ],
        [
          'p4',
          'p4',
          'p4',
          'p4',
          'p4',
          'p6',
          'p6',
          'p6',
          'p6',
          'p6',
          'p6',
          'p6',
        ],
        [
          'p2',
          'p2',
          'p2',
          'p2',
          'p2',
          'p0',
          'p0',
          'p0',
          'p0',
          'p0',
          'p0',
          'p0',
        ],
        [
          'p2',
          'p2',
          'p2',
          'p2',
          'p2',
          'p0',
          'p0',
          'p0',
          'p0',
          'p0',
          'p0',
          'p0',
        ],
      ],
    },
  },
}

type Region = { x: number; y: number; w: number; h: number }

// Random rectangular subdivisions, scored for source fit and balanced image size.
// The exported tracks/areas are authoritative; reproducing a PRNG is unnecessary.
function arrange(
  projects: MosaicProject[],
  aspect: number,
  random: () => number,
): MosaicArrangement {
  let best: MosaicArrangement | undefined
  let bestScore = -Infinity
  for (let attempt = 0; attempt < 64; attempt++) {
    const regions: Region[] = [{ x: 0, y: 0, w: 12, h: 12 }]
    while (regions.length < projects.length) {
      const candidates = regions.filter(r => r.w >= 4 || r.h >= 4)
      if (!candidates.length) break
      candidates.sort((a, b) => b.w * b.h - a.w * a.h)
      const region =
        candidates[Math.floor(random() * Math.min(2, candidates.length))]
      const vertical = region.h < 4 || (region.w >= 4 && random() < 0.5)
      const length = vertical ? region.w : region.h
      const cut = 2 + Math.floor(random() * (length - 3))
      const first = { ...region, ...(vertical ? { w: cut } : { h: cut }) }
      const second = vertical
        ? { ...region, x: region.x + cut, w: region.w - cut }
        : { ...region, y: region.y + cut, h: region.h - cut }
      regions.splice(regions.indexOf(region), 1, first, second)
    }
    if (regions.length !== projects.length) continue
    for (let i = regions.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[regions[i], regions[j]] = [regions[j], regions[i]]
    }
    const areas = Array.from({ length: 12 }, () => Array<string>(12).fill('.'))
    let score = 0
    regions.forEach((r, i) => {
      const media = projects[i].media[0]
      const fit = Math.min(
        ((r.w / r.h) * aspect) / (media.width / media.height),
        media.width / media.height / ((r.w / r.h) * aspect),
      )
      const visibleArea = ((r.w * r.h) / 144) * fit
      score += Math.log(Math.max(visibleArea, 0.0001))
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) areas[y][x] = `p${i}`
    })
    if (score > bestScore) {
      bestScore = score
      best = { columns: Array(12).fill(1), rows: Array(12).fill(1), areas }
    }
  }
  if (!best) throw new Error('Unable to arrange these projects')
  return best
}

export function shuffleMosaicLayout(
  projects: MosaicProject[],
  aspect: number,
  random = Math.random,
): MosaicLayout {
  return {
    projectAreas: Object.fromEntries(
      projects.map((project, i) => [project.slug, `p${i}`]),
    ),
    arrangements: {
      landscape: arrange(projects, aspect >= 1 ? aspect : 16 / 9, random),
      portrait: arrange(projects, aspect < 1 ? aspect : 9 / 16, random),
    },
  }
}
