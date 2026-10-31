const ICON_FAMILY_CLASS_NAME = 'fa-sharp fa-solid'

const ICON_CLASSES = {
  up: 'fa-caret-up',
  down: 'fa-caret-down',
  left: 'fa-caret-left',
  right: 'fa-caret-right',
  close: 'fa-xmark',
  collapse: 'fa-minus-large',
  notes: 'fa-notes',
  external: 'fa-arrow-up-right-from-square',
  replay: 'fa-arrow-rotate-left',
  play: 'fa-play',
  pause: 'fa-pause',
  circlePause: 'fa-circle-pause',
  circlePlay: 'fa-circle-play',
  system: 'fa-display',
  light: 'fa-sun',
  dark: 'fa-moon',
  linkedin: 'fa-linkedin',
  figma: 'fa-figma',
  email: 'fa-envelope',
} as const

export type PortfolioIconName = keyof typeof ICON_CLASSES

const ICON_SIZE_CLASSES = {
  control:
    'size-[var(--portfolio-logo-size)] [--portfolio-icon-size:var(--portfolio-logo-size)]',
  keyboard: 'size-[10px] [--portfolio-icon-size:10px]',
  // Text-button slots follow their labels rather than the standalone controls.
  label: 'size-[1em] [--portfolio-icon-size:1em]',
} as const

export function PortfolioIcon({
  name,
  size = 'control',
  inline = false,
  className,
}: {
  name: PortfolioIconName
  size?: keyof typeof ICON_SIZE_CLASSES
  inline?: boolean
  className?: string
}) {
  const family =
    name === 'linkedin' || name === 'figma'
      ? 'fa-brands'
      : name === 'circlePause' || name === 'circlePlay'
        ? 'fa-solid'
        : ICON_FAMILY_CLASS_NAME
  // Icons within text inherit its size without the control slot's glyph scaling.
  if (inline) {
    return (
      <i
        data-portfolio-icon={name}
        className={`${family} ${ICON_CLASSES[name]} ${className ?? ''}`}
        aria-hidden="true"
      />
    )
  }

  return (
    <span
      data-portfolio-icon={name}
      className={`inline-grid shrink-0 place-items-center ${ICON_SIZE_CLASSES[size]} ${className ?? ''}`}
      aria-hidden="true"
    >
      <i
        className={`portfolio-icon-glyph ${family} ${ICON_CLASSES[name]}`}
      />
    </span>
  )
}
