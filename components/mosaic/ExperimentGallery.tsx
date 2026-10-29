'use client'

import Link from 'next/link'
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { PortfolioLogoMark } from '@/components/portfolio/presentation/PortfolioLogoMark'
import { MosaicViewerLoader, preloadMosaicViewer } from './MosaicViewerLoader'
import {
  mosaicUrl,
  readMosaicLocation,
  type ExperimentBasePath,
} from './routing'
import type { MosaicOrigin, MosaicProject } from './types'
import styles from './ExperimentGallery.module.css'
import theme from './MosaicTheme.module.css'
import { gsap, mosaicEase, seconds } from './motion'
import { portfolioMotion } from '@/lib/portfolioTokens'
import { holdMosaicSource, restoreMosaicFocus } from './sourceVisual'
import { useMosaicDevIndicatorHidden } from './useMosaicDevIndicatorHidden'
import { useVisitedProjects } from './useVisitedProjects'
import { mosaicFont } from '@/lib/mosaicFonts'

type Session = {
  project: MosaicProject
  index: number
  origin: MosaicOrigin | null
  open: boolean
}

export type ExperimentGalleryContext = {
  open: (
    project: MosaicProject,
    origin: MosaicOrigin,
    trigger: HTMLButtonElement,
  ) => void
  playbackPaused: boolean
  logoReady: boolean
  visitedProjects: readonly string[]
  clearViewHistory: () => void
}

const GalleryContext = createContext<ExperimentGalleryContext | null>(null)

export function useExperimentGallery() {
  const context = useContext(GalleryContext)
  if (!context) {
    throw new Error(
      'useExperimentGallery must be used within ExperimentGallery',
    )
  }
  return context
}

export function ExperimentGallery({
  projects,
  basePath,
  className,
  children,
  openingDisabled = false,
  toolbar,
  adjusting = false,
}: {
  projects: MosaicProject[]
  basePath: ExperimentBasePath
  className: string
  children: ReactNode
  openingDisabled?: boolean
  toolbar?: ReactNode
  adjusting?: boolean
}) {
  const [session, setSession] = useState<Session | null>(null)
  const { visitedProjects, markVisited, clearViewHistory } = useVisitedProjects()
  useMosaicDevIndicatorHidden(session !== null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const restoreKeyboardFocusRef = useRef(true)
  const restoreFocusRef = useRef<HTMLButtonElement | null>(null)
  const mainRef = useRef<HTMLElement | null>(null)
  const logoRef = useRef<HTMLAnchorElement | null>(null)
  const [logoReady, setLogoReady] = useState(false)

  useEffect(() => {
    preloadMosaicViewer()
  }, [])

  useLayoutEffect(() => {
    const logo = logoRef.current
    if (!logo) return
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let timeline: gsap.core.Timeline
    const context = gsap.context(() => {
      timeline = gsap.timeline({
        paused: true,
        onComplete: () => setLogoReady(true),
      })
      timeline
        .addLabel('logo')
        .fromTo(
          logo,
          { opacity: 0 },
          {
            opacity: 1,
            duration: seconds(portfolioMotion.mosaicLogo),
            ease: mosaicEase.fade,
          },
        )
        .addLabel('ready')
      if (motion.matches) timeline.progress(1)
      else timeline.play()
    }, mainRef)
    const changed = () => {
      if (motion.matches) timeline.progress(1).pause()
    }
    motion.addEventListener('change', changed)
    return () => {
      motion.removeEventListener('change', changed)
      context.revert()
    }
  }, [])

  const syncLocation = useCallback(() => {
    const location = readMosaicLocation(window.location.search, projects)
    setSession(current =>
      location
        ? {
            ...location,
            origin:
              current?.project.id === location.project.id
                ? current.origin
                : null,
            open: true,
          }
        : current
          ? { ...current, open: false }
          : null,
    )
  }, [projects])

  useEffect(() => {
    // Hydrate URL-owned state, then keep browser Back/Forward authoritative.
    // react-doctor-disable-next-line react-hooks-js/set-state-in-effect
    syncLocation()
    window.addEventListener('popstate', syncLocation)
    return () => window.removeEventListener('popstate', syncLocation)
  }, [syncLocation])

  useEffect(() => {
    if (session || !restoreFocusRef.current) return
    const target = restoreFocusRef.current
    // A cold direct link can close before packing/media readiness releases the
    // tile's inert state. Restore only after both the tile and portal are ready.
    const restore = () => {
      if (target.closest('[inert]')) return
      observer.disconnect()
      restoreMosaicFocus(target)
      if (!restoreKeyboardFocusRef.current) target.blur()
      restoreFocusRef.current = null
    }
    const observer = new MutationObserver(restore)
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['inert'],
    })
    restore()
    return () => observer.disconnect()
  }, [session])

  function open(
    project: MosaicProject,
    origin: MosaicOrigin,
    trigger: HTMLButtonElement,
  ) {
    if (session || openingDisabled || adjusting) return
    restoreKeyboardFocusRef.current = trigger.matches(':focus-visible')
    holdMosaicSource(trigger)
    triggerRef.current = trigger
    window.history.pushState(
      { ...window.history.state, mosaicViewer: basePath },
      '',
      mosaicUrl(basePath, project),
    )
    setSession({ project, origin, index: 0, open: true })
  }

  const requestClose = useCallback(() => {
    if (window.history.state?.mosaicViewer === basePath) window.history.back()
    else {
      window.history.replaceState(window.history.state, '', mosaicUrl(basePath))
      syncLocation()
    }
  }, [basePath, syncLocation])

  function changeSlide(index: number) {
    if (!session?.open || index === session.index) return
    window.history.replaceState(
      window.history.state,
      '',
      mosaicUrl(basePath, session.project, index),
    )
    setSession(current => (current ? { ...current, index } : null))
  }

  function exited() {
    if (session?.open) return
    const trigger =
      triggerRef.current ??
      mainRef.current?.querySelector<HTMLButtonElement>(
        `[data-mosaic-project="${session?.project.slug}"]`,
      )
    restoreFocusRef.current = trigger ?? null
    setSession(null)
  }

  return (
    // Keep our inert main inside a stable wrapper: the lightbox owns inert on
    // body children and must not capture/restore our temporary main state.
    <div data-mosaic-root className={`${theme.scope} ${mosaicFont.className}`}>
      <main
        ref={mainRef}
        className={className}
        inert={session !== null}
        data-interactive-pop="off"
        data-mosaic-adjusting={adjusting && !session ? 'true' : undefined}
        aria-label="Aaron Wright’s visual portfolio"
      >
        <GalleryContext.Provider
          value={{
            open,
            playbackPaused: session !== null,
            logoReady,
            visitedProjects,
            clearViewHistory,
          }}
        >
          {children}
          <Link
            ref={logoRef}
            href="/work"
            aria-label="Aaron Wright — portfolio"
            className={styles.logo}
            data-mosaic-logo
            prefetch={false}
          >
            <PortfolioLogoMark />
          </Link>
          {!session ? toolbar : null}
        </GalleryContext.Provider>
      </main>
      {session ? (
        <MosaicViewerLoader
          key={session.project.id}
          project={session.project}
          index={session.index}
          open={session.open}
          origin={session.origin}
          onIndexChange={changeSlide}
          onRequestClose={requestClose}
          onOpened={() => markVisited(session.project.id)}
          onExited={exited}
        />
      ) : null}
    </div>
  )
}
