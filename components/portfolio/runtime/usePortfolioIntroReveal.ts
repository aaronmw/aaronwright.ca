import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react'
import { gsap } from 'gsap'
import type { PortfolioProject, PortfolioScreenshot } from '@/lib/portfolio'
import {
  isBuildingWithAiTextSlide,
  modalMediaKey,
  type ProjectSlide,
} from '@/components/portfolio/domain/slides'
import type { SectionNavigationHandle } from '@/components/portfolio/navigation/SectionNavigation'
import type { PortfolioIntroPhase } from './types'

const START_SCREEN_INDEX = -1

function nextAnimationFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

type UsePortfolioIntroRevealOptions = {
  projects: PortfolioProject[]
  projectSlides: Record<string, ProjectSlide[]>
  normalizedInitialProjectIndex: number
  initialSlideIndexes: number[]
  initialTargetScreenshot: PortfolioScreenshot | undefined
  initialModalOpen: boolean
  openingMediaKeys: string[]
  backgroundMediaQueue: string[]
  mediaFailure: unknown
  ensureMediaReady: (mediaKeys: string[]) => Promise<void>
  preloadQueue: (mediaKeys: string[], concurrency: number) => Promise<void>
  setIsModalOpen: (isOpen: boolean) => void
  replaceModalUrl: (project: PortfolioProject, slide: ProjectSlide) => void
  syncHorizontalViewports: (
    slideIndexes: number[],
    behavior: ScrollBehavior,
  ) => void
  curtainRef: RefObject<HTMLDivElement | null>
  verticalRef: RefObject<HTMLDivElement | null>
  sectionNavigationControllerRef: RefObject<SectionNavigationHandle | null>
  initialRevealCompleteRef: MutableRefObject<boolean>
  scrollSyncRef: MutableRefObject<boolean>
}

export function usePortfolioIntroReveal({
  projects,
  projectSlides,
  normalizedInitialProjectIndex,
  initialSlideIndexes,
  initialTargetScreenshot,
  initialModalOpen,
  openingMediaKeys,
  backgroundMediaQueue,
  mediaFailure,
  ensureMediaReady,
  preloadQueue,
  setIsModalOpen,
  replaceModalUrl,
  syncHorizontalViewports,
  curtainRef,
  verticalRef,
  sectionNavigationControllerRef,
  initialRevealCompleteRef,
  scrollSyncRef,
}: UsePortfolioIntroRevealOptions) {
  const initialModalRequestedRef = useRef(initialModalOpen)
  const introTimelineRef = useRef<gsap.core.Timeline | null>(null)
  const initialRevealStartedRef = useRef(false)
  const [introPhase, setIntroPhase] = useState<PortfolioIntroPhase>('loading')
  const renderedIntroPhase: PortfolioIntroPhase = mediaFailure
    ? 'error'
    : introPhase

  const startInitialRevealEvent = useEffectEvent(async () => {
    const vertical = verticalRef.current
    const curtain = curtainRef.current
    if (!vertical || !curtain) return

    const initialProject =
      normalizedInitialProjectIndex >= 0
        ? projects[normalizedInitialProjectIndex]
        : undefined
    const initialSlide = initialProject
      ? projectSlides[initialProject.slug][
          initialSlideIndexes[normalizedInitialProjectIndex] ?? 0
        ]
      : undefined
    const shouldOpenInitialModal = Boolean(
      initialModalRequestedRef.current &&
      initialProject &&
      initialSlide?.kind === 'screenshot' &&
      !isBuildingWithAiTextSlide(initialProject, initialSlide),
    )

    window.history.scrollRestoration = 'manual'
    scrollSyncRef.current = true
    vertical.scrollTo({ top: 0, behavior: 'auto' })
    syncHorizontalViewports(initialSlideIndexes, 'auto')

    await Promise.all([
      document.fonts.ready.catch(() => undefined),
      nextAnimationFrame().then(nextAnimationFrame),
    ])

    if (
      shouldOpenInitialModal &&
      initialProject &&
      initialSlide?.kind === 'screenshot'
    ) {
      setIsModalOpen(true)
      replaceModalUrl(initialProject, initialSlide)
      await nextAnimationFrame()
      await nextAnimationFrame()
    }

    const requiredMediaKeys = [...openingMediaKeys]
    if (shouldOpenInitialModal && initialTargetScreenshot) {
      requiredMediaKeys.push(modalMediaKey(initialTargetScreenshot))
    }

    try {
      await ensureMediaReady(requiredMediaKeys)
    } catch {
      setIntroPhase('error')
      return
    }

    const targetScrollTop =
      vertical.clientHeight * (normalizedInitialProjectIndex + 1)
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const revealDuration = reducedMotion
      ? 0.2
      : normalizedInitialProjectIndex === START_SCREEN_INDEX
        ? 0.6
        : 0.9

    setIntroPhase('revealing')
    gsap.set(curtain, { autoAlpha: 1 })
    await new Promise<void>(resolve => {
      if (reducedMotion) {
        vertical.scrollTo({ top: targetScrollTop, behavior: 'auto' })
      }
      const timeline = gsap.timeline({
        defaults: { ease: 'power3.inOut' },
        onComplete: resolve,
      })
      introTimelineRef.current = timeline
      if (!reducedMotion && targetScrollTop !== 0) {
        timeline.to(
          vertical,
          {
            scrollTop: targetScrollTop,
            duration: revealDuration,
            onUpdate: () =>
              sectionNavigationControllerRef.current?.syncSourcePosition(),
          },
          0,
        )
      }
      timeline.to(curtain, { autoAlpha: 0, duration: revealDuration }, 0)
    })

    introTimelineRef.current = null
    initialRevealCompleteRef.current = true
    scrollSyncRef.current = false
    setIntroPhase('ready')
    void preloadQueue(backgroundMediaQueue, 2).catch(() => undefined)
  })

  useLayoutEffect(() => {
    if (initialRevealStartedRef.current) return
    initialRevealStartedRef.current = true
    void startInitialRevealEvent()
    return () => {
      introTimelineRef.current?.kill()
      introTimelineRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mediaFailure) return
    introTimelineRef.current?.kill()
    introTimelineRef.current = null
    scrollSyncRef.current = false
    const curtain = curtainRef.current
    if (!curtain) return
    gsap.to(curtain, {
      autoAlpha: 1,
      duration: initialRevealCompleteRef.current ? 0.3 : 0,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  }, [curtainRef, initialRevealCompleteRef, mediaFailure, scrollSyncRef])

  return renderedIntroPhase
}
