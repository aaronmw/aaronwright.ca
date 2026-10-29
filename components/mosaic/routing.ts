import type { MosaicProject } from './types'

export type ExperimentBasePath = '/grid-version'

export function readMosaicLocation(search: string, projects: MosaicProject[]) {
  const params = new URLSearchParams(search)
  const requested = params.get('project')
  const slug = requested === 'nextphrase' ? 'nextphrase-dot-app' : requested
  const project = projects.find(item => item.slug === slug)
  if (!project || !project.media.length) return null
  const index = Math.max(
    0,
    project.media.findIndex(item => item.slug === params.get('slide')),
  )
  return { project, index }
}

export function mosaicUrl(
  basePath: ExperimentBasePath,
  project?: MosaicProject,
  index = 0,
) {
  if (!project) return basePath
  const params = new URLSearchParams({
    project: project.slug,
    slide: project.media[index].slug,
  })
  return `${basePath}?${params}`
}

export function legacyMosaicRedirectUrl(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue
    for (const item of Array.isArray(value) ? value : [value]) {
      params.append(key, item)
    }
  }
  const query = params.toString()
  return `/grid-version${query ? `?${query}` : ''}`
}
