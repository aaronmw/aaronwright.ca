import type {
  AnchorHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { PortfolioProject } from '@/lib/portfolio'
import { OverscrollIndicator } from '@/components/OverscrollIndicator'

type ProjectColorStyle = CSSProperties & {
  '--project-body-color': string
  '--project-content-color': string
  '--project-color': string
}

type MarkdownLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  node?: unknown
}

type MarkdownHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  node?: unknown
}

type MarkdownHeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

const INLINE_MARKDOWN_COMPONENTS = {
  p({ children }) {
    return <>{children}</>
  },
} satisfies Components

const PORTFOLIO_MARKDOWN_COMPONENTS = {
  a: MarkdownLink,
  h1: createMarkdownHeading('h2'),
  h2: createMarkdownHeading('h3'),
  h3: createMarkdownHeading('h4'),
  h4: createMarkdownHeading('h5'),
  h5: createMarkdownHeading('h6'),
  h6: createMarkdownHeading('h6'),
} satisfies Components

const PROJECT_LEDGER_METADATA_PATTERN = /^\*\*(.+?)\s+·(?:\s|&nbsp;)+(.+?)\*\*$/
const PROJECT_LEDGER_DECK_PATTERN = /^\s*#{1,6}\s+(.+)\s*$/

export function PortfolioLedgerFrame({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode
}) {
  return (
    <section
      {...props}
      className={`portfolio-ledger-copy font-resume-mono tabular-nums border-t border-t-resume-signal bg-resume-paper text-left text-sm font-normal leading-[1.5] text-resume-ink [--project-body-color:var(--color-resume-ink)] [--project-color:var(--color-resume-signal)] [border-top-width:var(--logo-stroke-width)] ${
        className ?? ''
      }`}
    >
      {children}
    </section>
  )
}

export function PortfolioLedgerLabel({ children }: { children: ReactNode }) {
  return <span className="block font-normal uppercase">{children}</span>
}

function isExternalSiteHref(href?: string) {
  if (!href) {
    return false
  }

  try {
    const url = new URL(href, 'https://aaronwright.ca')

    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname !== 'aaronwright.ca' &&
      url.hostname !== 'www.aaronwright.ca'
    )
  } catch {
    return false
  }
}

function MarkdownLink({
  href,
  children,
  node: _node,
  ...props
}: MarkdownLinkProps) {
  const isExternalSite = isExternalSiteHref(href)

  return (
    <a
      {...props}
      href={href}
      target={isExternalSite ? '_blank' : props.target}
      rel={isExternalSite ? 'noopener noreferrer' : props.rel}
    >
      {children}
    </a>
  )
}

function createMarkdownHeading(Tag: MarkdownHeadingTag) {
  function MarkdownHeading({ node: _node, ...props }: MarkdownHeadingProps) {
    return <Tag {...props} />
  }

  return MarkdownHeading
}

export function ProjectDescription({
  project,
  projectNumber,
  projectColor,
  projectBodyColor,
  projectContentColor,
  setDescriptionRef,
  isWideLayout,
  className,
  layoutStyle,
  presence,
}: {
  project: PortfolioProject
  projectNumber: string
  projectColor: string
  projectBodyColor: string
  projectContentColor: string
  setDescriptionRef: (node: HTMLDivElement | null) => void
  isWideLayout: boolean
  className?: string
  layoutStyle?: CSSProperties
  presence?: 'visible' | 'concealed'
}) {
  const ledgerContent = getProjectLedgerContent(project.descriptionMarkdown)

  return (
    <div
      data-portfolio-presence={presence}
      className={`portfolio-project-content-theme ${
        presence
          ? 'portfolio-presence-transition portfolio-left-rail-transition'
          : ''
      } h-full min-h-0 min-w-0 pr-1 ${className ?? ''}`}
      style={
        {
          ...layoutStyle,
          '--project-color': projectColor,
          '--project-body-color': projectBodyColor,
          '--project-content-color': projectContentColor,
          ...(isWideLayout
            ? {
                paddingLeft:
                  'max(var(--portfolio-control-gutter-width), calc(env(safe-area-inset-left, 0px) + 5.5rem))',
              }
            : {}),
        } as ProjectColorStyle
      }
    >
      <div className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto]">
        <OverscrollIndicator
          ref={setDescriptionRef}
          className="portfolio-themed-scrollbar overflow-x-hidden pr-4 [--project-color:var(--color-resume-signal)]"
          contentClassName="portfolio-project-content portfolio-markdown-scroll-body min-w-0 w-full max-w-[52ch]"
          indicatorColor="var(--color-resume-paper)"
        >
          <PortfolioLedgerFrame aria-label={`${project.title} overview`}>
            <div className="min-w-0 py-2">
              <PortfolioLedgerLabel>Company / product</PortfolioLedgerLabel>
              <h1 className="mt-1 [font-size:inherit] font-normal leading-[inherit] tracking-normal">
                {project.title}
              </h1>
            </div>
            {ledgerContent.roleMarkdown && ledgerContent.tenure ? (
              <dl className="grid grid-cols-[min-content_minmax(0,1fr)_min-content] text-left">
                <div className="min-w-0 whitespace-nowrap py-2">
                  <dt>
                    <PortfolioLedgerLabel>Case study</PortfolioLedgerLabel>
                  </dt>
                  <dd className="mt-1 text-left font-normal">
                    {projectNumber}
                  </dd>
                </div>
                <div className="min-w-0 py-2">
                  <dt>
                    <PortfolioLedgerLabel>Role</PortfolioLedgerLabel>
                  </dt>
                  <dd className="portfolio-ledger-role mt-1 min-w-0 whitespace-normal text-left font-normal">
                    <PortfolioInlineMarkdown>
                      {ledgerContent.roleMarkdown}
                    </PortfolioInlineMarkdown>
                  </dd>
                </div>
                <div className="min-w-0 whitespace-nowrap py-2">
                  <dt>
                    <PortfolioLedgerLabel>Tenure</PortfolioLedgerLabel>
                  </dt>
                  <dd className="mt-1 text-left font-normal">
                    {ledgerContent.tenure}
                  </dd>
                </div>
              </dl>
            ) : null}
            {ledgerContent.deckMarkdown ? (
              <div className="min-w-0 py-2">
                <PortfolioLedgerLabel>Title</PortfolioLedgerLabel>
                <h2 className="mt-1 [font-size:inherit] font-bold leading-[inherit] tracking-normal text-balance">
                  <PortfolioInlineMarkdown>
                    {ledgerContent.deckMarkdown}
                  </PortfolioInlineMarkdown>
                </h2>
              </div>
            ) : null}
            <div className="min-w-0 py-2">
              <PortfolioLedgerLabel>Summary / intro</PortfolioLedgerLabel>
              <div className="portfolio-markdown prose mt-1 max-w-none [font-size:inherit] font-normal leading-[inherit] [&>:first-child]:mt-0 [&>:last-child]:mb-0">
                <PortfolioMarkdown>
                  {ledgerContent.bodyMarkdown}
                </PortfolioMarkdown>
              </div>
            </div>
          </PortfolioLedgerFrame>
        </OverscrollIndicator>
        {project.url ? (
          <div className="pr-4 pt-5">
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-14 w-full items-center justify-center rounded-lg bg-resume-signal px-6 py-4 text-center text-base font-bold leading-none tracking-normal text-resume-paper outline-none transition-[background-color,filter] duration-200 hover:brightness-110 focus-visible:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-resume-signal active:brightness-95 motion-reduce:transition-none"
            >
              Visit Project
            </a>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function AboutMeTextPanel({
  project,
  projectNumber,
  projectColor,
  projectBodyColor,
  projectContentColor,
  isWideLayout,
  setDescriptionRef,
}: {
  project: PortfolioProject
  projectNumber: string
  projectColor: string
  projectBodyColor: string
  projectContentColor: string
  isWideLayout: boolean
  setDescriptionRef: (node: HTMLDivElement | null) => void
}) {
  return (
    <section
      className={`portfolio-project-content-theme min-h-0 min-w-0 w-full ${
        isWideLayout
          ? 'portfolio-theme-panel portfolio-wide-content-inset h-full py-16 backdrop-blur-md'
          : 'h-full'
      }`}
      aria-label={project.title}
      style={
        {
          '--project-color': projectColor,
          '--project-body-color': projectBodyColor,
          '--project-content-color': projectContentColor,
        } as ProjectColorStyle
      }
    >
      <OverscrollIndicator
        ref={setDescriptionRef}
        wrapperClassName="h-full w-full max-w-[calc(72ch+2rem)]"
        className="portfolio-themed-scrollbar h-full overflow-x-hidden pr-4 [--project-color:var(--color-resume-signal)]"
        contentClassName="portfolio-project-content portfolio-markdown-scroll-body min-w-0 w-full max-w-[72ch]"
        indicatorColor="var(--color-resume-paper)"
      >
        <PortfolioLedgerFrame aria-label={project.title}>
          <div className="grid grid-cols-[min-content_minmax(0,1fr)]">
            <div className="min-w-0 whitespace-nowrap py-2">
              <PortfolioLedgerLabel>Profile</PortfolioLedgerLabel>
              <p className="mt-1">{projectNumber}</p>
            </div>
            <div className="min-w-0 py-2">
              <PortfolioLedgerLabel>Title</PortfolioLedgerLabel>
              <h1 className="mt-1 [font-size:inherit] font-bold leading-[inherit] tracking-normal">
                {project.title}
              </h1>
            </div>
          </div>
          <div className="min-w-0 py-2">
            <PortfolioLedgerLabel>Summary / intro</PortfolioLedgerLabel>
            <div className="mt-1">
              <PortfolioInlineMarkdown>{project.blurb}</PortfolioInlineMarkdown>
            </div>
          </div>
          <div className="min-w-0 py-2">
            <PortfolioLedgerLabel>Background</PortfolioLedgerLabel>
            <div className="portfolio-markdown prose mt-1 max-w-none [font-size:inherit] font-normal leading-[inherit] [&>:first-child]:mt-0 [&>:last-child]:mb-0">
              <PortfolioMarkdown>
                {project.descriptionMarkdown}
              </PortfolioMarkdown>
            </div>
          </div>
        </PortfolioLedgerFrame>
      </OverscrollIndicator>
    </section>
  )
}

export function SlideDescription({
  children,
  projectColor,
  projectBodyColor,
  projectContentColor,
  hidden,
  isWideLayout,
  transitionState = 'visible',
}: {
  children: string
  projectColor: string
  projectBodyColor: string
  projectContentColor: string
  hidden: boolean
  isWideLayout: boolean
  transitionState?: 'entering' | 'visible' | 'exiting'
}) {
  const isConcealed = hidden || transitionState !== 'visible'
  const renderedTransitionState = hidden ? 'hidden' : transitionState
  const ledgerContent = getProjectLedgerContent(children)

  return (
    <div
      data-portfolio-slide-description
      data-transition-state={renderedTransitionState}
      className="portfolio-project-content-theme portfolio-presence-transition portfolio-slide-description-transition portfolio-themed-scrollbar fixed z-30 max-h-[50dvh] w-[min(60ch,calc(100vw-3rem))] overflow-y-auto text-resume-ink"
      aria-hidden={isConcealed ? true : undefined}
      inert={isConcealed}
      style={
        {
          '--project-color': projectColor,
          '--project-body-color': 'var(--color-resume-ink)',
          '--project-content-color': projectContentColor,
          'right': isWideLayout
            ? 'calc(var(--portfolio-navigation-rail-reserved-width) + env(safe-area-inset-right, 0px))'
            : 'max(1.5rem, calc(env(safe-area-inset-right, 0px) + 1.5rem))',
          'bottom':
            'calc(var(--portfolio-slide-navigation-reserved-height, 5.25rem) + 1rem)',
        } as ProjectColorStyle
      }
    >
      <PortfolioLedgerFrame className="px-[1.5em] !text-[80%]">
        {ledgerContent.deckMarkdown ? (
          <div className="min-w-0 py-[1.5em]">
            <PortfolioLedgerLabel>Title</PortfolioLedgerLabel>
            <h2 className="mt-1 [font-size:inherit] font-bold leading-[inherit] tracking-normal text-balance">
              <PortfolioInlineMarkdown>
                {ledgerContent.deckMarkdown}
              </PortfolioInlineMarkdown>
            </h2>
          </div>
        ) : null}
        <div className="min-w-0 py-[1.5em]">
          <PortfolioLedgerLabel>Summary / intro</PortfolioLedgerLabel>
          <div className="portfolio-markdown prose mt-1 max-w-none [font-size:inherit] font-normal leading-[1.65] [&>:first-child]:mt-0 [&>:last-child]:mb-0">
            <PortfolioMarkdown>{ledgerContent.bodyMarkdown}</PortfolioMarkdown>
          </div>
        </div>
      </PortfolioLedgerFrame>
    </div>
  )
}

function PortfolioMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={PORTFOLIO_MARKDOWN_COMPONENTS}
    >
      {children}
    </ReactMarkdown>
  )
}

export function PortfolioInlineMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      allowedElements={['p', 'strong', 'em', 'code', 'br', 'del', 'abbr']}
      unwrapDisallowed
      components={INLINE_MARKDOWN_COMPONENTS}
    >
      {children}
    </ReactMarkdown>
  )
}

function getProjectLedgerContent(markdown: string) {
  const lines = markdown.split('\n')
  const metadataIndex = lines.findIndex(line =>
    PROJECT_LEDGER_METADATA_PATTERN.test(line.trim()),
  )
  const metadataMatch =
    metadataIndex >= 0
      ? lines[metadataIndex].trim().match(PROJECT_LEDGER_METADATA_PATTERN)
      : null
  const contentLines = lines.filter(
    (_, lineIndex) => lineIndex !== metadataIndex,
  )
  const deckIndex = contentLines.findIndex(line =>
    PROJECT_LEDGER_DECK_PATTERN.test(line),
  )
  const deckMatch =
    deckIndex >= 0
      ? contentLines[deckIndex].match(PROJECT_LEDGER_DECK_PATTERN)
      : null

  return {
    deckMarkdown: deckMatch?.[1],
    bodyMarkdown: contentLines
      .filter((_, lineIndex) => lineIndex !== deckIndex)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n'),
    roleMarkdown: metadataMatch?.[1],
    tenure: metadataMatch?.[2],
  }
}
