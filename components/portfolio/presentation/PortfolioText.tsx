'use client'

import {
  Fragment,
  memo,
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
import { portfolioMotion } from '@/lib/portfolioTokens'
import type { ResolvedProjectNarrative } from '../domain/narrative'
import { OverscrollIndicator } from '@/components/OverscrollIndicator'
import { FiveByFive } from './FiveByFive'
import { PortfolioList, PortfolioListItem } from './PortfolioList'

type MarkdownLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  node?: unknown
}
type MarkdownHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  node?: unknown
}
type MarkdownHeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

const PROJECT_HEADING_UNDERLINE_CHARACTER = '-'

const PORTFOLIO_MARKDOWN_SCHEMA = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'abbr'],
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
  ul({ node: _node, ...props }) {
    return <PortfolioList {...props} />
  },
  li({ node: _node, ...props }) {
    return <PortfolioListItem {...props} />
  },
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
      className={`portfolio-ledger-copy font-resume-mono tabular-nums text-left font-normal text-portfolio-text [--project-color:var(--portfolio-accent)] ${className ?? ''}`}
    >
      {children}
    </section>
  )
}

export function PortfolioLedgerLabel({ children }: { children: ReactNode }) {
  return <span className="block font-normal uppercase">{children}</span>
}

export function ProjectHeadingUnderline({
  title,
  className,
}: {
  title: string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`-mb-[0.5lh] block text-portfolio-text-dimmed ${className ?? ''}`}
    >
      {PROJECT_HEADING_UNDERLINE_CHARACTER.repeat(
        Array.from(title.replaceAll('\u00ad', '')).length,
      )}
    </span>
  )
}

export function ProjectInformation({
  project,
  projectNumber,
  narrative,
  expanded,
  alignWithLogo = true,
  onSelectSlide,
}: {
  project: PortfolioProject
  projectNumber: string
  narrative: ResolvedProjectNarrative
  expanded: boolean
  alignWithLogo?: boolean
  onSelectSlide: (slideIndex: number) => void
}) {
  const hasMultipleRoles = project.rolesMarkdown?.includes('→') ?? false

  return (
    <PortfolioLedgerFrame
      aria-label={`${project.title} overview`}
      className={`grid min-h-0 min-w-0 w-full grid-rows-[auto_minmax(0,1fr)] gap-y-[2lh] overflow-hidden max-[30rem]:gap-y-[1lh] ${expanded ? 'h-full max-w-[var(--resume-content-width)]' : 'max-h-full max-w-[calc(var(--portfolio-description-rail-width)-var(--portfolio-control-gutter-width)-var(--portfolio-default-spacing))] justify-self-center'}`}
    >
      <ProjectMetadata
        project={project}
        projectNumber={projectNumber}
        hasMultipleRoles={hasMultipleRoles}
        alignWithLogo={alignWithLogo}
        onSelectSlide={onSelectSlide}
      />
      <NarrativePresence narrative={narrative} />
    </PortfolioLedgerFrame>
  )
}

export function ProjectMetadata({
  project,
  projectNumber,
  hasMultipleRoles: hasMultipleRolesOverride,
  alignWithLogo = true,
  onSelectSlide,
  children,
}: {
  project: PortfolioProject
  projectNumber: string
  hasMultipleRoles?: boolean
  alignWithLogo?: boolean
  onSelectSlide: (slideIndex: number) => void
  children?: ReactNode
}) {
  const hasMultipleRoles =
    hasMultipleRolesOverride ?? project.rolesMarkdown?.includes('→') ?? false

  return (
    <header
      data-portfolio-project-metadata
      data-portfolio-selectable-text
      className={`shrink-0 ${children ? 'portfolio-project-header' : ''} ${
        alignWithLogo
          ? 'pt-[calc(var(--portfolio-logo-control-inset)+(var(--portfolio-logo-size)-1lh)/2+2px)]'
          : ''
      }`}
    >
      <div
        className={
          children
            ? 'flex min-w-0 flex-wrap items-start gap-x-6 gap-y-[1lh]'
            : 'min-w-0'
        }
      >
        <dl className="flex shrink-0 items-baseline gap-x-[2ch] whitespace-nowrap">
          <dt className="sr-only">Project</dt>
          <dd className="font-bold text-portfolio-text-dimmed">
            {projectNumber}
          </dd>
          <dt className="sr-only">Company or product</dt>
          <dd className="font-bold">
            <button
              type="button"
              data-interactive-pop="off"
              aria-label={`Show first ${project.title} slide`}
              className="portfolio-prose-link portfolio-prose-link--faux-underlined block border-0 bg-transparent p-0 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-portfolio-accent"
              onClick={() => onSelectSlide(0)}
            >
              <span className="block uppercase">{project.title}</span>
              <ProjectHeadingUnderline title={project.title} />
            </button>
          </dd>
        </dl>
        {children ? (
          <div className="ml-auto min-w-0 w-max max-w-full shrink-0">
            {children}
          </div>
        ) : null}
      </div>
      {project.rolesMarkdown || project.dates ? (
        <ProjectRoleDates
          rolesMarkdown={project.rolesMarkdown}
          dates={project.dates}
          hasMultipleRoles={hasMultipleRoles}
        />
      ) : null}
    </header>
  )
}

function ProjectRoleDates({
  rolesMarkdown,
  dates,
  hasMultipleRoles,
}: {
  rolesMarkdown?: string
  dates?: string
  hasMultipleRoles: boolean
}) {
  if (!rolesMarkdown && !dates) return null

  return (
    <dl
      className={
        hasMultipleRoles
          ? 'mt-[2lh] flex min-w-0 flex-col items-start text-left text-portfolio-text-dimmed max-[30rem]:mt-[1lh]'
          : 'mt-[2lh] flex min-w-0 flex-wrap items-baseline justify-start gap-x-[1ch] text-left text-portfolio-text-dimmed max-[30rem]:mt-[1lh]'
      }
    >
      {rolesMarkdown ? (
        <>
          <dt className="sr-only">Role</dt>
          <dd className="shrink-0 whitespace-nowrap max-[30rem]:max-w-full max-[30rem]:whitespace-normal">
            {rolesMarkdown.split('→').map((role, index) => (
              <Fragment key={role}>
                {index > 0 ? ' → ' : null}
                <span className="whitespace-nowrap">
                  <PortfolioInlineMarkdown>{role.trim()}</PortfolioInlineMarkdown>
                </span>
              </Fragment>
            ))}
          </dd>
        </>
      ) : null}
      {dates ? (
        <>
          <dt className="sr-only">Dates</dt>
          <dd className="w-full shrink-0 whitespace-nowrap">{dates}</dd>
        </>
      ) : null}
    </dl>
  )
}

export const ProjectNarrative = memo(function ProjectNarrative({
  narrative,
}: {
  narrative: ResolvedProjectNarrative
}) {
  return (
    <div>
      <NarrativeContent narrative={narrative} />
    </div>
  )
})

function NarrativePresence({
  narrative,
}: {
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
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches
      ? portfolioMotion.reduced
      : portfolioMotion.narrative
    const timeout = window.setTimeout(() => {
      dispatchTransition({ type: 'complete' })
    }, duration)
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(enterFrame)
      window.clearTimeout(timeout)
    }
  }, [narrative])

  const { rendered, outgoing, entered } = transition

  return (
    <OverscrollIndicator
      bottomScrollControl={<FiveByFive variant="down" />}
      persistentScrollbar
      ref={scrollRef}
      className="overflow-x-hidden [--project-color:var(--portfolio-accent)]"
      contentClassName="relative min-h-full min-w-0 overflow-clip"
    >
      {outgoing ? (
        <NarrativeContent
          narrative={outgoing}
          className={`absolute inset-x-0 top-0 transition-opacity duration-[var(--portfolio-motion-narrative)] motion-reduce:duration-[var(--portfolio-motion-reduced)] ${entered ? 'opacity-0' : 'opacity-100'}`}
        />
      ) : null}
      <NarrativeContent
        narrative={rendered}
        className={`transition-opacity duration-[var(--portfolio-motion-narrative)] motion-reduce:duration-[var(--portfolio-motion-reduced)] ${outgoing && !entered ? 'opacity-0' : 'opacity-100'}`}
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
  narrative,
  className,
}: {
  narrative: ResolvedProjectNarrative
  className?: string
}) {
  return (
    <div
      data-portfolio-selectable-text
      className={`min-w-0 pb-2 ${className ?? ''}`}
    >
      <div data-portfolio-slide-narrative-content>
        {narrative.titleMarkdown ? (
          <h1 className="mb-[1lh] font-bold">
            <PortfolioInlineMarkdown>
              {narrative.titleMarkdown}
            </PortfolioInlineMarkdown>
          </h1>
        ) : null}
        <div className="portfolio-markdown prose max-w-none font-normal">
          <PortfolioMarkdown>{narrative.bodyMarkdown}</PortfolioMarkdown>
        </div>
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
