import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { PortfolioMarkdown } from '@/components/portfolio/presentation/PortfolioText'
import { VideoScrubber } from '@/components/portfolio/presentation/VideoScrubber'

it('keeps legacy Markdown lists bulleted unless the grid opts into divided rows', () => {
  const original = renderToStaticMarkup(
    <PortfolioMarkdown>
      {'- First statement\n- Second statement'}
    </PortfolioMarkdown>,
  )
  expect(original).toContain('data-variant="bulleted"')
  expect(original.match(/class="portfolio-list-bullet"/g)).toHaveLength(2)
  expect(original).not.toContain('data-variant="divided"')
  const grid = renderToStaticMarkup(
    <PortfolioMarkdown listVariant="divided">
      {'- First statement'}
    </PortfolioMarkdown>,
  )
  expect(grid).toContain('data-variant="divided"')
})

it('keeps the legacy seek control treatment and makes buffering an explicit opt-in', () => {
  const props = {
    label: 'Seek through published video',
    currentTime: 25,
    duration: 100,
    onScrub: () => undefined,
  }
  const original = renderToStaticMarkup(<VideoScrubber {...props} />)
  expect(original).toContain('aria-label="Seek through published video"')
  expect(original).toContain('value="25"')
  expect(original).toContain('--portfolio-video-progress:25%')
  expect(original).toContain('focus-within:opacity-100')
  expect(original).toContain('group-hover/video:opacity-100')
  expect(original).not.toContain('data-video-buffered')
  const grid = renderToStaticMarkup(
    <VideoScrubber
      {...props}
      className="grid-seek"
      buffered={[{ start: 0, end: 80 }]}
    />,
  )
  expect(grid).toContain('class="grid-seek"')
  expect(grid).toContain('data-video-buffered="true"')
})
