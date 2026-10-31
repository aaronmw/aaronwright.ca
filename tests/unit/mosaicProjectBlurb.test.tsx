import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MosaicProjectBlurb } from '@/components/mosaic/MosaicProjectBlurb'
import { MosaicProjectLink } from '@/components/mosaic/MosaicProjectLink'
import { MosaicProjectEditor } from '@/components/mosaic/MosaicProjectEditor'
import { serializeMosaicCompositions } from '@/components/mosaic/composition'
import { mosaicProjects } from '@/lib/mosaic'

const project = mosaicProjects.find(item => item.slug === 'nextphrase-dot-app')!

describe('expanded project blurb', () => {
  it.each(mosaicProjects.filter(project => project.url))(
    'preserves the $slug destination and external-link affordance',
    project => {
      const markup = renderToStaticMarkup(
        <MosaicProjectLink href={project.url!} title={project.title} />,
      )
      expect(markup).toContain(`href="${project.url}"`)
      expect(markup).toContain(`Visit ${project.title.replace(/\u00ad/g, '')}`)
      expect(markup).not.toContain('\u00ad')
      expect(markup).toContain('target="_blank"')
      expect(markup).toContain('rel="noopener noreferrer"')
      expect(markup).toContain('(opens in a new tab)')
      expect(markup).toContain('data-portfolio-icon="external"')
      expect(markup).toContain('fa-sharp fa-solid fa-arrow-up-right-from-square')
    },
  )

  it('omits the overlay when no longer blurb has been written', () => {
    for (const longSummary of [undefined, '', '  \n ']) {
      expect(
        renderToStaticMarkup(
          <MosaicProjectBlurb
            project={{ ...project, longSummary }}
            video
            visible
          />,
        ),
      ).toBe('')
    }
  })

  it('uses the shared Markdown renderer for links and sanitized content', () => {
    const markup = renderToStaticMarkup(
      <MosaicProjectBlurb
        project={{
          ...project,
          longSummary: `${project.longSummary}\n\n<script>alert(1)</script><img src="/example.png" onerror="alert(2)">`,
        }}
        video
        visible
      />,
    )
    expect(markup).toContain('href="https://nextphrase.app"')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('rel="noopener noreferrer"')
    expect(markup).not.toContain('<script')
    expect(markup).not.toContain('onerror')
    expect(markup).toContain('aria-label="NextPhrase overview"')
  })

  it('preserves each placement through the editor, clipboard, and viewer', () => {
    for (const vertical of ['top', 'bottom'] as const) {
      for (const horizontal of ['left', 'center', 'right'] as const) {
        const edited = { ...project, blurbPosition: { vertical, horizontal } }
        const copied = JSON.parse(serializeMosaicCompositions([edited]))
          .projects[project.id]
        const editor = renderToStaticMarkup(
          <MosaicProjectEditor
            project={copied}
            change={() => {}}
            pending={false}
          />,
        )
        expect(editor).toContain(`value="${vertical}" selected=""`)
        expect(editor).toContain(`value="${horizontal}" selected=""`)
        for (const video of [false, true]) {
          const viewer = renderToStaticMarkup(
            <MosaicProjectBlurb
              project={copied}
              video={video}
              visible
            />,
          )
          expect(viewer).toContain(`data-vertical="${vertical}"`)
          expect(viewer).toContain(`data-horizontal="${horizontal}"`)
        }
      }
    }
  })

  it('defaults older projects to bottom-left and keeps links inert during transitions', () => {
    const markup = renderToStaticMarkup(
      <MosaicProjectBlurb
        project={project}
        video
        visible={false}
      />,
    )
    expect(markup).toContain('data-vertical="bottom"')
    expect(markup).toContain('data-horizontal="left"')
    expect(markup).toContain('inert=""')
    expect(markup).toContain('data-animating="true"')
    expect(markup).not.toContain('data-visible')
  })

  it('keeps one toggle outside the inert content so animation cannot replace or disable it', () => {
    const markup = renderToStaticMarkup(
      <MosaicProjectBlurb
        project={project}
        video
        visible
      />,
    )
    expect(markup.match(/<button\b/g)).toHaveLength(2)
    const content = markup.slice(
      markup.indexOf('<aside'),
      markup.indexOf('</aside>'),
    )
    const controls = markup.slice(markup.indexOf('</aside>'))
    expect(content).toContain('inert=""')
    expect(content.match(/<button\b/g)).toHaveLength(1)
    expect(content).toContain('aria-label="Minimize project details"')
    expect(content).toContain('data-portfolio-icon="collapse"')
    expect(controls.match(/<button\b/g)).toHaveLength(1)
    expect(controls).toContain('data-portfolio-icon="notes"')
    expect(controls).toContain('aria-expanded="true"')
    expect(controls).toContain('aria-label="Hide project details"')
    expect(controls).not.toContain('disabled=""')
  })
})
