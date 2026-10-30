import type { MosaicProject } from './types'

export type ExperimentBasePath = '/work'
export type MosaicSearchParams = Record<string, string | string[] | undefined>
const viewerParameters = ['project', 'slide', 'modal', 'zoom']

export function canonicalMosaicSlug(slug: string) {
  return slug === 'nextphrase-dot-app' ? 'nextphrase' : slug
}

export function findMosaicProject(slug: string, projects: MosaicProject[]) {
  return projects.find(
    project => canonicalMosaicSlug(project.slug) === canonicalMosaicSlug(slug),
  )
}

export function readMosaicLocation(
  pathname: string,
  projects: MosaicProject[],
) {
  const match = /^\/work\/([^/]+)\/?$/.exec(pathname)
  if (!match) return null
  let slug: string
  try {
    slug = decodeURIComponent(match[1])
  } catch {
    return null
  }
  const project = findMosaicProject(slug, projects)
  return project?.media.length ? { project, index: 0 } : null
}

export function mosaicSearchParams(search: MosaicSearchParams) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined) continue
    for (const item of Array.isArray(value) ? value : [value])
      params.append(key, item)
  }
  return params
}

export function hasViewerParameters(search: MosaicSearchParams) {
  return viewerParameters.some(key => search[key] !== undefined)
}

export function cleanMosaicSearchParams(search: string | URLSearchParams) {
  const params = new URLSearchParams(search)
  for (const key of viewerParameters) params.delete(key)
  return params
}

export function mosaicUrl(
  basePath: ExperimentBasePath,
  project?: MosaicProject,
  search: string | URLSearchParams = '',
) {
  const params = cleanMosaicSearchParams(search)
  const path = project
    ? `${basePath}/${encodeURIComponent(canonicalMosaicSlug(project.slug))}`
    : basePath
  const query = params.toString()
  return `${path}${query ? `?${query}` : ''}`
}

export function legacyMosaicRedirectUrl(
  search: MosaicSearchParams,
  projects: MosaicProject[],
) {
  const params = mosaicSearchParams(search)
  const requested = params.get('project')
  const project = requested ? findMosaicProject(requested, projects) : undefined
  if (requested && !project) return null
  return mosaicUrl('/work', project, params)
}
