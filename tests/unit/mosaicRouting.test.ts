import { describe, expect, it } from 'vitest'
import { mosaicProjects } from '@/lib/mosaic'
import {
  legacyMosaicRedirectUrl,
  mosaicUrl,
  readMosaicLocation,
} from '@/components/mosaic/routing'

describe('canonical mosaic URLs', () => {
  it.each(mosaicProjects)(
    'round trips $slug without changing the internal ID',
    project => {
      const path = mosaicUrl('/work', project)
      expect(readMosaicLocation(path, mosaicProjects)).toEqual({
        project,
        index: 0,
      })
      expect(path).toBe(
        `/work/${project.slug === 'nextphrase-dot-app' ? 'nextphrase' : project.slug}`,
      )
    },
  )

  it('preserves repeated unrelated values and removes obsolete viewer parameters', () => {
    const project = mosaicProjects.find(item => item.slug === 'loopio')!
    const search =
      '?project=nextphrase&slide=intro&modal=image&zoom=image&tag=a%26b&tag=design+systems&empty='
    expect(mosaicUrl('/work', project, search)).toBe(
      '/work/loopio?tag=a%26b&tag=design+systems&empty=',
    )
    expect(mosaicUrl('/work', undefined, search)).toBe(
      '/work?tag=a%26b&tag=design+systems&empty=',
    )
  })

  it.each([
    '/work',
    '/work/missing',
    '/work/loopio/missing',
    '/elsewhere/loopio',
    '/work/%',
  ])('rejects non-project location %s', path => {
    expect(readMosaicLocation(path, mosaicProjects)).toBeNull()
  })
})

describe('legacy mosaic redirects', () => {
  it('converts query viewers directly to canonical paths', () => {
    expect(
      legacyMosaicRedirectUrl(
        {
          project: 'nextphrase-dot-app',
          slide: 'intro',
          tag: ['one', 'two'],
          modal: 'image',
          zoom: 'image',
        },
        mosaicProjects,
      ),
    ).toBe('/work/nextphrase?tag=one&tag=two')
    expect(
      legacyMosaicRedirectUrl({ project: 'nextphrase' }, mosaicProjects),
    ).toBe('/work/nextphrase')
  })
  it('removes obsolete parameters for ordinary entry', () => {
    expect(
      legacyMosaicRedirectUrl({ slide: 'intro', empty: '' }, mosaicProjects),
    ).toBe('/work?empty=')
    expect(legacyMosaicRedirectUrl({}, mosaicProjects)).toBe('/work')
  })
  it('signals unknown projects so the route can return 404', () => {
    expect(
      legacyMosaicRedirectUrl({ project: 'missing' }, mosaicProjects),
    ).toBeNull()
  })
})
