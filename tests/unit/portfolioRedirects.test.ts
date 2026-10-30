import { describe, expect, it, vi } from 'vitest'
import portfolioRedirects from '../../netlify/edge-functions/portfolio-redirects'

const origin = 'https://portfolio.example'

describe('Netlify portfolio redirect responses', () => {
  it.each([301, 302, 307, 308])(
    'cleans reattached viewer keys without changing status %s',
    async status => {
      const next = vi.fn(
        async () =>
          new Response('redirect body', {
            status,
            headers: {
              'location':
                '/work/loopio?project=loopio&slide=cover&modal=image&zoom=2',
              'cache-control': 'public, max-age=0',
            },
          }),
      )
      const response = await portfolioRedirects(
        new Request(`${origin}/v2?project=loopio`),
        { next },
      )
      expect(next).toHaveBeenCalledOnce()
      expect(response?.status).toBe(status)
      expect(response?.headers.get('location')).toBe('/work/loopio')
      expect(response?.headers.get('cache-control')).toBe('public, max-age=0')
      expect(await response?.text()).toBe('redirect body')
    },
  )

  it('preserves repeated unrelated values and fragments', async () => {
    const next = async () =>
      new Response(null, {
        status: 308,
        headers: {
          location: `${origin}/work/nextphrase?ref=a&project=nextphrase&ref=b&empty=#notes`,
        },
      })
    const response = await portfolioRedirects(
      new Request(
        `${origin}/grid-version?project=nextphrase&ref=a&ref=b&empty=`,
      ),
      { next },
    )
    expect(response?.headers.get('location')).toBe(
      '/work/nextphrase?ref=a&ref=b&empty=#notes',
    )
  })

  it.each(['/work', '/work/loopio?ref=a&ref=b'])(
    'passes ordinary requests through without wrapping %s',
    async path => {
      const next = vi.fn()
      expect(
        await portfolioRedirects(new Request(origin + path), { next }),
      ).toBeUndefined()
      expect(next).not.toHaveBeenCalled()
    },
  )

  it.each([
    { status: 404, location: null },
    { status: 200, location: null },
    { status: 308, location: '/work/loopio' },
    {
      status: 308,
      location: 'https://elsewhere.example/work/loopio?project=loopio',
    },
    { status: 308, location: '/case-study-intake?project=loopio' },
  ])(
    'preserves unrelated or already correct response $status $location',
    async ({ status, location }) => {
      const original = new Response(null, {
        status,
        headers: location ? { location } : {},
      })
      expect(
        await portfolioRedirects(new Request(`${origin}/v2?project=loopio`), {
          next: async () => original,
        }),
      ).toBe(original)
    },
  )
})
