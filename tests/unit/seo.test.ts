import { describe, expect, it, vi } from 'vitest'
import { getPortfolioMetadata, SHARE_IMAGE_SLUGS } from '../../lib/seo'
import {
  HOME_SEO,
  metadataText,
  mosaicSeoCopy,
  portfolioSeoCopy,
  SITE_NAME,
  SITE_URL,
} from '../../lib/siteMetadata'
import { portfolioSlides } from '../../lib/portfolio'
import { mosaicProjects } from '../../lib/mosaic'
import { canonicalMosaicSlug } from '../../components/mosaic/routing'
import { getProjectSlides } from '../../components/portfolio/domain/slides'
import { getShareCard } from '../../lib/shareCards'
import {
  copyEditorEntries,
  migrateCopyEditorDraftValues,
} from '../../lib/copyEditor'
import sitemap from '../../app/sitemap'
import robots from '../../app/robots'

vi.mock('@/components/mosaic/MosaicPortfolio', () => ({
  MosaicPortfolio: () => null,
}))
vi.mock('@/lib/portfolioFonts', () => ({
  portfolioFont: { className: '', variable: '' },
}))

import ProjectPage, {
  generateMetadata,
} from '../../app/work/[workSlug]/[[...screenshotSlug]]/page'
import { GET, generateStaticParams } from '../../app/og/[slug]/route'

describe('portfolio search and share metadata', () => {
  it('gives the homepage complete social metadata without inheriting nested defaults', () => {
    const metadata = getPortfolioMetadata('/work?utm_source=message')!
    expect(metadata).toMatchObject({
      title: { absolute: HOME_SEO.title },
      description: HOME_SEO.description,
      alternates: { canonical: `${SITE_URL}/work` },
      openGraph: {
        title: HOME_SEO.title,
        description: HOME_SEO.description,
        siteName: 'Aaron M. Wright',
        url: `${SITE_URL}/work`,
        type: 'website',
        images: [
          {
            url: `${SITE_URL}/og/portfolio`,
            width: 1200,
            height: 630,
            type: 'image/png',
            alt: expect.any(String),
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: HOME_SEO.title,
        description: HOME_SEO.description,
        images: [{ url: `${SITE_URL}/og/portfolio`, alt: expect.any(String) }],
      },
    })
    expect(mosaicSeoCopy()).toEqual(HOME_SEO)
  })

  it.each(portfolioSlides)(
    'keeps legacy $slug SEO copy and canonicalizes its slide/query variants',
    project => {
      const base = `/work/${project.slug}`
      const copy = portfolioSeoCopy(project)
      const routes = [
        base,
        ...getProjectSlides(project)
          .filter(slide => slide.kind !== 'description')
          .map(slide => `${base}/${slide.slug}`),
      ]
      for (const route of routes) {
        for (const query of [
          '',
          '?modal=image',
          '?zoom=image&utm_source=share',
        ]) {
          const metadata = getPortfolioMetadata(`${route}${query}`)!
          expect(metadata.title).toEqual({ absolute: copy.title })
          expect(metadata.description).toBe(copy.description)
          expect(metadata.alternates?.canonical).toBe(`${SITE_URL}${base}`)
          expect(metadata.openGraph).toMatchObject({
            url: `${SITE_URL}${base}`,
            title: copy.title,
            images: [{ url: `${SITE_URL}/og/${project.slug}` }],
          })
          expect(metadata.twitter).toMatchObject({
            title: copy.title,
            description: copy.description,
          })
        }
      }
    },
  )

  it.each(mosaicProjects)(
    'provides canonical metadata and share cards for the grid project $slug',
    project => {
      const slug = canonicalMosaicSlug(project.slug)
      const base = `/work/${slug}`
      const copy = mosaicSeoCopy(project)
      for (const route of [
        base,
        `/work/${project.slug}`,
        ...project.media.map(media => `${base}/${media.slug}`),
      ]) {
        const metadata = getPortfolioMetadata(`${route}?modal=image`)!
        expect(metadata).toMatchObject({
          title: { absolute: copy.title },
          description: copy.description,
          alternates: { canonical: `${SITE_URL}${base}` },
          openGraph: {
            title: copy.title,
            description: copy.description,
            url: `${SITE_URL}${base}`,
            images: [{ url: `${SITE_URL}/og/${slug}` }],
          },
          twitter: {
            card: 'summary_large_image',
            title: copy.title,
            description: copy.description,
            images: [{ url: `${SITE_URL}/og/${slug}` }],
          },
        })
        expect(metadata.robots).toBeUndefined()
      }
      const legacyProject = portfolioSlides.find(item => item.slug === slug)
      const card = getShareCard(slug)!
      if (legacyProject) {
        expect(copy).toEqual(portfolioSeoCopy(legacyProject))
        expect(Boolean(card.artwork)).toBe(slug !== 'about-me')
      } else {
        expect(copy).toEqual({
          title: `${metadataText(project.title)} | ${SITE_NAME}`,
          description: metadataText(project.summary),
        })
        expect(card).toMatchObject({
          title: metadataText(project.title),
          description: copy.description,
        })
        expect(card.artwork).toBeUndefined()
      }
    },
  )

  it('preserves NextPhrase’s established page and share-image URLs', () => {
    expect(getPortfolioMetadata('/work/nextphrase-dot-app')).toEqual(
      getPortfolioMetadata('/work/nextphrase'),
    )
    expect(SHARE_IMAGE_SLUGS).toContain('nextphrase')
    expect(SHARE_IMAGE_SLUGS).not.toContain('nextphrase-dot-app')
    expect(getShareCard('nextphrase')?.artwork?.clipToPhoneFrame).toBe(true)
  })

  it('removes display markup and soft hyphens from metadata', () => {
    expect(
      metadataText(
        ' **Next\u00adPhrase** &amp; <abbr title="Progressive Web App">PWA</abbr>&nbsp;\n tools ',
      ),
    ).toBe('NextPhrase & PWA tools')
    expect(metadataText('Next&shy;Phrase &#173; &#xAD;')).toBe('NextPhrase')
  })

  it.each([
    '/work/missing',
    '/work/loopio/missing',
    '/work/loopio/dense-work/extra',
    '/work/about-me/description',
    '/work/cycles-dot-money/missing',
    '/work/radio-app/demo/extra',
    '/copy-editor',
    '/case-study-intake',
    '/case-study-brochures',
    'https://example.com/work',
  ])('rejects invalid or non-portfolio metadata paths: %s', path => {
    expect(getPortfolioMetadata(path)).toBeNull()
  })

  it('keeps route-level 404s and the legacy About redirect', async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({ workSlug: 'loopio?injected=query' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(
      generateMetadata({
        params: Promise.resolve({ workSlug: 'missing' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(
      generateMetadata({
        params: Promise.resolve({
          workSlug: 'loopio',
          screenshotSlug: ['missing'],
        }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    const legacyAboutProps = {
      params: Promise.resolve({
        workSlug: 'about-me',
        screenshotSlug: ['overview'],
      }),
      searchParams: Promise.resolve({}),
    }
    await expect(generateMetadata(legacyAboutProps)).resolves.toMatchObject({
      alternates: { canonical: `${SITE_URL}/work/about-me` },
    })
    await expect(ProjectPage(legacyAboutProps)).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;replace;/work/about-me;308;',
    })
  })

  it('lists only the eleven canonical portfolio pages', () => {
    expect(sitemap().map(entry => entry.url)).toEqual([
      `${SITE_URL}/work`,
      ...mosaicProjects.map(
        project => `${SITE_URL}/work/${canonicalMosaicSlug(project.slug)}`,
      ),
    ])
    expect(sitemap()).toHaveLength(11)
    expect(new Set(sitemap().map(entry => entry.url)).size).toBe(11)
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`)
  })

  it('provides eleven static cards and rejects unknown image slugs', async () => {
    expect(SHARE_IMAGE_SLUGS).toHaveLength(11)
    expect(generateStaticParams()).toEqual(
      SHARE_IMAGE_SLUGS.map(slug => ({ slug })),
    )
    for (const slug of SHARE_IMAGE_SLUGS)
      expect(getShareCard(slug)).not.toBeNull()
    expect(getShareCard('../../resume.pdf')).toBeNull()
    const response = await GET(new Request(`${SITE_URL}/og/missing`), {
      params: Promise.resolve({ slug: 'missing' }),
    })
    expect(response.status).toBe(404)
  })

  it('uses canonical SEO originals in the copy export and retains draft migration compatibility', () => {
    const entries = new Map(
      copyEditorEntries.map(entry => [entry.id, entry.value]),
    )
    expect(entries.get('site.metadata.workTitle')).toBe(HOME_SEO.title)
    expect(entries.get('site.metadata.workDescription')).toBe(
      HOME_SEO.description,
    )
    expect(entries.has('site.metadata.homeDescription')).toBe(false)
    for (const project of portfolioSlides) {
      expect(entries.get(`portfolio.projects.${project.slug}.seo.title`)).toBe(
        project.seo.title,
      )
      expect(
        entries.get(`portfolio.projects.${project.slug}.seo.description`),
      ).toBe(project.seo.description)
    }
    expect(
      migrateCopyEditorDraftValues({
        'site.metadata.homeDescription': 'Old draft',
      }),
    ).toEqual({ 'site.metadata.workDescription': 'Old draft' })
    expect(
      migrateCopyEditorDraftValues({
        'site.metadata.homeDescription': 'Old draft',
        'site.metadata.workDescription': 'New draft',
        'portfolio.projects.loopio.seo.title': 'Custom title',
      }),
    ).toEqual({
      'site.metadata.workDescription': 'New draft',
      'portfolio.projects.loopio.seo.title': 'Custom title',
    })
  })
})
