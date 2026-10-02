const ICON_FAMILY_CLASS_NAME = 'fa-sharp fa-solid'

const ICON_CLASSES = {
  up: 'fa-caret-up',
  down: 'fa-caret-down',
  left: 'fa-caret-left',
  right: 'fa-caret-right',
  close: 'fa-xmark',
  replay: 'fa-arrow-rotate-left',
  system: 'fa-display',
  light: 'fa-sun',
  dark: 'fa-moon',
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
  className,
}: {
  name: PortfolioIconName
  size?: keyof typeof ICON_SIZE_CLASSES
  className?: string
}) {
  return (
    <span
      data-portfolio-icon={name}
      className={`inline-grid shrink-0 place-items-center ${ICON_SIZE_CLASSES[size]} ${className ?? ''}`}
      aria-hidden="true"
    >
      <i
        className={`portfolio-icon-glyph ${ICON_FAMILY_CLASS_NAME} ${ICON_CLASSES[name]}`}
      />
    </span>
  )
}
