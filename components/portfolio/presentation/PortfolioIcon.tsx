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

export function PortfolioIcon({
  name,
  size = 'control',
  className,
}: {
  name: PortfolioIconName
  size?: 'control' | 'keyboard'
  className?: string
}) {
  return (
    <span
      data-portfolio-icon={name}
      className={`inline-grid shrink-0 place-items-center ${
        size === 'keyboard'
          ? 'size-[10px] [--portfolio-icon-size:10px]'
          : 'size-[var(--portfolio-logo-size)] [--portfolio-icon-size:var(--portfolio-logo-size)]'
      } ${className ?? ''}`}
      aria-hidden="true"
    >
      <i
        className={`portfolio-icon-glyph ${ICON_FAMILY_CLASS_NAME} ${ICON_CLASSES[name]}`}
      />
    </span>
  )
}
