import { describe, expect, it } from 'vitest'
import { mosaicProjects } from '@/lib/mosaic'
import {
  legacyMosaicRedirectUrl,
  mosaicUrl,
  readMosaicLocation,
} from '@/components/mosaic/routing'

describe('mosaic gallery URLs', () => {
  it.each(['/grid-version'] as const)(
    'restores the single project slide on %s',
    basePath => {
      const project = mosaicProjects.find(item => item.slug === 'loopio')!
      const location = readMosaicLocation(
        new URL(mosaicUrl(basePath, project), 'https://example.test').search,
        mosaicProjects,
      )
      expect(location).toEqual({ project, index: 0 })
      expect(mosaicProjects.every(item => item.media.length === 1)).toBe(true)
      expect(
        new URL(mosaicUrl(basePath, project), 'https://example.test')
          .pathname,
      ).toBe(basePath)
      expect(mosaicUrl(basePath)).toBe(basePath)
    },
  )

  it('keeps old NextPhrase links usable after the project rename', () => {
    const project = mosaicProjects.find(
      item => item.slug === 'nextphrase-dot-app',
    )!
    expect(
      readMosaicLocation('?project=nextphrase&slide=intro', mosaicProjects),
    ).toEqual({ project, index: 0 })
    expect(mosaicUrl('/grid-version', project)).toBe(
      '/grid-version?project=nextphrase-dot-app&slide=intro',
    )
  })

  it('fits the first slide when a removed or missing slide slug is requested', () => {
    expect(
      readMosaicLocation('?project=loopio&slide=a-mature-product', mosaicProjects)
        ?.index,
    ).toBe(0)
    expect(readMosaicLocation('?project=loopio', mosaicProjects)?.index).toBe(0)
  })

  it('leaves the mosaic usable for unknown project URLs and ordinary entry', () => {
    expect(readMosaicLocation('?project=missing', mosaicProjects)).toBeNull()
    expect(readMosaicLocation('', mosaicProjects)).toBeNull()
  })
})

describe('legacy mosaic route', () => {
  it('preserves gallery and unrelated query values, including repeated keys', () => {
    const url = new URL(
      legacyMosaicRedirectUrl({
        project: 'loopio',
        slide: 'intro',
        tag: ['design systems', 'a&b'],
        empty: '',
        missing: undefined,
      }),
      'https://example.test',
    )
    expect(url.pathname).toBe('/grid-version')
    expect(Array.from(url.searchParams)).toEqual([
      ['project', 'loopio'],
      ['slide', 'intro'],
      ['tag', 'design systems'],
      ['tag', 'a&b'],
      ['empty', ''],
    ])
  })

  it('redirects ordinary entry without a trailing empty query', () => {
    expect(legacyMosaicRedirectUrl({})).toBe('/grid-version')
  })
})
