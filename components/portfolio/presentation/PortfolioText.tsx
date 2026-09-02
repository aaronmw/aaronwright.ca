'use client'

import {
  type ComponentProps,
  useEffect,
  useReducer,
  useRef,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { PortfolioProject } from '@/lib/portfolio'
import type { ResolvedProjectNarrative } from '../domain/narrative'
import { OverscrollIndicator } from '@/components/OverscrollIndicator'

type MarkdownLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  node?: unknown
}
type MarkdownHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  node?: unknown
}
type MarkdownHeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

const PORTFOLIO_MARKDOWN_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    abbr: [...(defaultSchema.attributes?.abbr ?? []), 'title'],
  },
}
const PORTFOLIO_REHYPE_PLUGINS: NonNullable<
  ComponentProps<typeof ReactMarkdown>['rehypePlugins']
> = [rehypeRaw, [rehypeSanitize, PORTFOLIO_MARKDOWN_SCHEMA]]

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

export function PortfolioLedgerFrame({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section
      {...props}
      className={`portfolio-ledger-copy font-resume-mono tabular-nums text-left text-sm font-normal leading-[1.5] text-[var(--portfolio-ink)] [--project-body-color:var(--portfolio-ink)] [--project-color:var(--color-resume-signal)] ${className ?? ''}`}
    >
      {children}
    </section>
  )
}

export function PortfolioLedgerLabel({ children }: { children: ReactNode }) {
  return <span className="block font-normal uppercase">{children}</span>
}

export function ProjectInformation({
  project,
  projectNumber,
  narrative,
  expanded,
}: {
  project: PortfolioProject
  projectNumber: string
  narrative: ResolvedProjectNarrative
  expanded: boolean
}) {
  const hasMultipleRoles = project.rolesMarkdown?.includes('→') ?? false

  return (
    <PortfolioLedgerFrame
      aria-label={`${project.title} overview`}
      className={`grid min-h-0 min-w-0 w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden ${expanded ? 'h-full max-w-[var(--resume-content-width)]' : 'max-h-full max-w-[calc(var(--portfolio-description-rail-width)-var(--portfolio-control-gutter-width)-var(--portfolio-default-spacing))] justify-self-center'}`}
    >
      <ProjectMetadata
        project={project}
        projectNumber={projectNumber}
        hasMultipleRoles={hasMultipleRoles}
      />
      <NarrativePresence
        project={project}
        narrative={narrative}
      />
    </PortfolioLedgerFrame>
  )
}

export function ProjectMetadata({
  project,
  projectNumber,
  hasMultipleRoles = project.rolesMarkdown?.includes('→') ?? false,
  alignWithLogo = true,
}: {
  project: PortfolioProject
  projectNumber: string
  hasMultipleRoles?: boolean
  alignWithLogo?: boolean
}) {
  return (
    <header
      data-portfolio-project-metadata
      data-portfolio-selectable-text
      className={`shrink-0 ${
        alignWithLogo
          ? 'pt-[calc(var(--portfolio-logo-control-inset)+(var(--portfolio-logo-size)-1lh)/2+2px)]'
          : ''
      }`}
    >
      <dl className="flex items-baseline justify-between gap-x-6">
        <div className="flex shrink-0 items-baseline gap-x-[1ch] whitespace-nowrap">
          <dt className="sr-only">Project</dt>
          <dd className="font-bold">{projectNumber}</dd>
          <dt className="sr-only">Company or product</dt>
          <dd className="font-bold">{project.title}</dd>
        </div>
        {project.rolesMarkdown || project.dates ? (
          <div
            className={
              hasMultipleRoles
                ? 'flex min-w-0 flex-col items-end justify-end text-right'
                : 'flex min-w-0 flex-wrap items-baseline justify-end gap-x-[1ch] text-right'
            }
          >
            {project.rolesMarkdown ? (
              <>
                <dt className="sr-only">Role</dt>
                <dd className="shrink-0 whitespace-nowrap">
                  <PortfolioInlineMarkdown>
                    {project.rolesMarkdown}
                  </PortfolioInlineMarkdown>
                </dd>
              </>
            ) : null}
            {project.dates ? (
              <>
                <dt className="sr-only">Dates</dt>
                <dd className="shrink-0 whitespace-nowrap">{project.dates}</dd>
              </>
            ) : null}
          </div>
        ) : null}
      </dl>
    </header>
  )
}

export function ProjectNarrative({
  project,
  narrative,
  wrapperClassName,
}: {
  project: PortfolioProject
  narrative: ResolvedProjectNarrative
  wrapperClassName?: string
}) {
  return (
    <OverscrollIndicator
      wrapperClassName={wrapperClassName}
      className="portfolio-themed-scrollbar overflow-x-hidden pr-3 [--project-color:var(--color-resume-signal)]"
      contentClassName="relative min-h-full min-w-0"
      indicatorColor="var(--color-resume-paper)"
    >
      <NarrativeContent
        project={project}
        narrative={narrative}
      />
    </OverscrollIndicator>
  )
}

function NarrativePresence({
  project,
  narrative,
}: {
  project: PortfolioProject
  narrative: ResolvedProjectNarrative
}) {
  const sourceIdRef = useRef(narrative.sourceId)
  const [transition, dispatchTransition] = useReducer(
    narrativeTransitionReducer,
    narrative,
    initialNarrativeTransition,
  )
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (narrative.sourceId === sourceIdRef.current) return
    sourceIdRef.current = narrative.sourceId
    let enterFrame = 0
    const frame = requestAnimationFrame(() => {
      dispatchTransition({ type: 'begin', narrative })
      scrollRef.current?.scrollTo({ top: 0 })
      enterFrame = requestAnimationFrame(() =>
        dispatchTransition({ type: 'enter' }),
      )
    })
    const timeout = window.setTimeout(() => {
      dispatchTransition({ type: 'complete' })
    }, 280)
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(enterFrame)
      window.clearTimeout(timeout)
    }
  }, [narrative])

  const { rendered, outgoing, entered } = transition

  return (
    <OverscrollIndicator
      ref={scrollRef}
      className="portfolio-themed-scrollbar overflow-x-hidden pr-3 [--project-color:var(--color-resume-signal)]"
      contentClassName="relative min-h-full min-w-0 overflow-clip"
      indicatorColor="var(--color-resume-paper)"
    >
      {outgoing ? (
        <NarrativeContent
          project={project}
          narrative={outgoing}
          className={`absolute inset-x-0 top-0 transition-opacity duration-[280ms] motion-reduce:duration-120 ${entered ? 'opacity-0' : 'opacity-100'}`}
        />
      ) : null}
      <NarrativeContent
        project={project}
        narrative={rendered}
        className={`transition-opacity duration-[280ms] motion-reduce:duration-120 ${outgoing && !entered ? 'opacity-0' : 'opacity-100'}`}
      />
    </OverscrollIndicator>
  )
}

type NarrativeTransitionState = {
  rendered: ResolvedProjectNarrative
  outgoing: ResolvedProjectNarrative | null
  entered: boolean
}

type NarrativeTransitionAction =
  | { type: 'begin'; narrative: ResolvedProjectNarrative }
  | { type: 'enter' }
  | { type: 'complete' }

function initialNarrativeTransition(
  narrative: ResolvedProjectNarrative,
): NarrativeTransitionState {
  return { rendered: narrative, outgoing: null, entered: true }
}

function narrativeTransitionReducer(
  state: NarrativeTransitionState,
  action: NarrativeTransitionAction,
): NarrativeTransitionState {
  switch (action.type) {
    case 'begin':
      return {
        rendered: action.narrative,
        outgoing: state.rendered,
        entered: false,
      }
    case 'enter':
      return { ...state, entered: true }
    case 'complete':
      return { ...state, outgoing: null }
  }
}

function NarrativeContent({
  project,
  narrative,
  className,
}: {
  project: PortfolioProject
  narrative: ResolvedProjectNarrative
  className?: string
}) {
  return (
    <div
      data-portfolio-selectable-text
      className={`min-w-0 pb-2 pt-[2lh] ${className ?? ''}`}
    >
      <div data-portfolio-slide-narrative-content>
        {narrative.titleMarkdown ? (
          <h1 className="mb-[1lh] [font-size:inherit] font-bold leading-[inherit] tracking-normal text-balance">
            <PortfolioInlineMarkdown>
              {narrative.titleMarkdown}
            </PortfolioInlineMarkdown>
          </h1>
        ) : null}
        <div className="portfolio-markdown portfolio-typewritten-copy prose max-w-none [font-size:inherit] font-normal leading-[inherit]">
          <PortfolioMarkdown>{narrative.bodyMarkdown}</PortfolioMarkdown>
        </div>
        {project.url ? (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex min-h-12 w-full items-center justify-center bg-resume-signal px-5 py-3 text-center font-bold text-resume-paper outline-none transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-resume-signal active:brightness-95 motion-reduce:transition-none"
          >
            Visit Project
          </a>
        ) : null}
      </div>
    </div>
  )
}

function isExternalSiteHref(href?: string) {
  if (!href) return false
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
  const external = isExternalSiteHref(href)
  return (
    <a
      {...props}
      href={href}
      target={external ? '_blank' : props.target}
      rel={external ? 'noopener noreferrer' : props.rel}
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

export function PortfolioMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={PORTFOLIO_REHYPE_PLUGINS}
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
      rehypePlugins={PORTFOLIO_REHYPE_PLUGINS}
      allowedElements={['p', 'strong', 'em', 'code', 'br', 'del', 'abbr']}
      unwrapDisallowed
      components={INLINE_MARKDOWN_COMPONENTS}
    >
      {children}
    </ReactMarkdown>
  )
}
