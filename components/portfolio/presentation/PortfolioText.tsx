'use client'

import {
  memo,
  type ComponentProps,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
} from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { ResolvedProjectNarrative } from '../domain/narrative'
import { PortfolioList, PortfolioListItem, type PortfolioListVariant } from './PortfolioList'

type MarkdownLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  node?: unknown
}
type MarkdownHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  node?: unknown
}
type MarkdownHeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

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

const DIVIDED_MARKDOWN_COMPONENTS = {
  ...PORTFOLIO_MARKDOWN_COMPONENTS,
  ul({ node: _node, ...props }) {
    return <PortfolioList {...props} variant="divided" />
  },
} satisfies Components

export const ProjectNarrative = memo(function ProjectNarrative({
  narrative,
  listVariant,
}: {
  narrative: ResolvedProjectNarrative
  listVariant?: PortfolioListVariant
}) {
  return (
    <div>
      <NarrativeContent narrative={narrative} listVariant={listVariant} />
    </div>
  )
})

function NarrativeContent({
  narrative,
  className,
  listVariant,
}: {
  narrative: ResolvedProjectNarrative
  className?: string
  listVariant?: PortfolioListVariant
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
          <PortfolioMarkdown listVariant={listVariant}>{narrative.bodyMarkdown}</PortfolioMarkdown>
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

export function PortfolioMarkdown({ children, listVariant = 'bulleted' }: { children: string; listVariant?: PortfolioListVariant }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={PORTFOLIO_REHYPE_PLUGINS}
      components={listVariant === 'divided' ? DIVIDED_MARKDOWN_COMPONENTS : PORTFOLIO_MARKDOWN_COMPONENTS}
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
