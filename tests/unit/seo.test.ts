import { describe, expect, it, vi } from 'vitest'
import { getPortfolioMetadata, SHARE_IMAGE_SLUGS } from '../../lib/seo'
import {
  HOME_SEO,
  metadataText,
  portfolioSeoCopy,
  SITE_URL,
} from '../../lib/siteMetadata'
import { portfolioSlides } from '../../lib/portfolio'
import { getProjectSlides } from '../../components/portfolio/domain/slides'
import { pageTitle } from '../../components/portfolio/domain/routing'
import { getShareCard } from '../../lib/shareCards'
import {
  copyEditorEntries,
  migrateCopyEditorDraftValues,
} from '../../lib/copyEditor'
import sitemap from '../../app/sitemap'
import robots from '../../app/robots'

vi.mock('@/components/portfolio/PortfolioBrowser', () => ({
  PortfolioBrowser: () => null,
}))
vi.mock('@/components/copy-editor/CopyEditor', () => ({
  CopyEditor: () => null,
}))
vi.mock('@/components/case-study-intake/CaseStudyIntake', () => ({
  CaseStudyIntake: () => null,
}))
vi.mock('@/components/case-study-brochures/CaseStudyBrochureEditor', () => ({
  CaseStudyBrochureEditor: () => null,
}))
vi.mock('@/lib/portfolioFonts', () => ({
  portfolioFont: { className: '', variable: '' },
}))

import { generateMetadata } from '../../app/work/[workSlug]/[[...screenshotSlug]]/page'
import { metadata as editorMetadata } from '../../app/copy-editor/page'
import { metadata as intakeMetadata } from '../../app/case-study-intake/page'
import { metadata as brochureMetadata } from '../../app/case-study-brochures/page'
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
    expect(pageTitle()).toBe(HOME_SEO.title)
  })

  it.each(portfolioSlides)(
    'keeps $slug and all its slide/query variants attached to one project',
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
            url: `${SITE_URL}${route}`,
            title: copy.title,
            images: [{ url: `${SITE_URL}/og/${project.slug}` }],
          })
          expect(metadata.twitter).toMatchObject({
            title: copy.title,
            description: copy.description,
          })
        }
      }
      expect(pageTitle(project)).toBe(copy.title)
    },
  )

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
    '/copy-editor',
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
    await expect(
      generateMetadata({
        params: Promise.resolve({
          workSlug: 'about-me',
          screenshotSlug: ['overview'],
        }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_REDIRECT')
  })

  it('lists only seven canonical pages and preserves private-page noindex', () => {
    expect(sitemap().map(entry => entry.url)).toEqual([
      `${SITE_URL}/work`,
      ...portfolioSlides.map(project => `${SITE_URL}/work/${project.slug}`),
    ])
    expect(sitemap()).toHaveLength(7)
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`)
    for (const metadata of [editorMetadata, intakeMetadata, brochureMetadata]) {
      expect(metadata.robots).toEqual({ index: false, follow: false })
    }
  })

  it('provides exactly seven static cards and rejects unknown image slugs', async () => {
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

  it('uses canonical SEO originals in the copy editor and retains existing drafts', () => {
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
