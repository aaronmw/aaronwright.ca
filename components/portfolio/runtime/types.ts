export type PortfolioIntroPhase = 'loading' | 'revealing' | 'ready' | 'error'

export type PendingNavigation =
  | { kind: 'project'; projectIndex: number }
  | { kind: 'slide'; projectIndex: number; slideIndex: number }
  | { kind: 'modal'; screenshotId: string }
  | null
