import {
  cleanMosaicSearchParams,
  hasViewerParameters,
} from '../../components/mosaic/routing'

type RedirectContext = { next: () => Promise<Response> }

/** Netlify reattaches incoming query keys when a redirect has an empty query.
 * Correct that downstream response after Next has resolved and validated it. */
export default async function portfolioRedirects(
  request: Request,
  context: RedirectContext,
) {
  const incoming = new URL(request.url)
  if (!hasViewerParameters(Object.fromEntries(incoming.searchParams))) return
  const response = await context.next()
  const location = response.headers.get('location')
  if (!location || ![301, 302, 307, 308].includes(response.status))
    return response
  const destination = new URL(location, incoming)
  if (
    destination.origin !== incoming.origin ||
    !/^\/work(?:\/|$)/.test(destination.pathname)
  )
    return response

  const query = cleanMosaicSearchParams(destination.search)
  if (query.toString() === destination.searchParams.toString()) return response
  destination.search = query.toString()
  const headers = new Headers(response.headers)
  headers.set(
    'location',
    destination.pathname + destination.search + destination.hash,
  )
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export const config = { path: ['/grid-version', '/v2', '/work', '/work/*'] }
