const MARKDOWN_HEADING_PATTERN = /^\s*#{1,6}\s+(.+?)\s*$/

export function parsePortfolioNarrative(markdown: string) {
  const lines = markdown.trim().split('\n')
  const headingIndex = lines.findIndex(line =>
    MARKDOWN_HEADING_PATTERN.test(line),
  )
  const headingMatch =
    headingIndex >= 0
      ? lines[headingIndex].match(MARKDOWN_HEADING_PATTERN)
      : null

  return {
    titleMarkdown: headingMatch?.[1],
    bodyMarkdown: lines
      .filter((_, index) => index !== headingIndex)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  }
}

export function composePortfolioNarrative(
  titleMarkdown: string | undefined,
  bodyMarkdown: string,
) {
  return [
    titleMarkdown?.trim() ? `# ${titleMarkdown.trim()}` : '',
    bodyMarkdown.trim(),
  ]
    .filter(Boolean)
    .join('\n\n')
}
