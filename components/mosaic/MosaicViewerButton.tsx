import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { CircularIconButton } from '../portfolio/presentation/PortfolioControls'
import styles from './MosaicViewer.module.css'

/** One treatment for every icon control in the expanded viewer. */
export function MosaicViewerButton({
  label,
  children,
  className = '',
  buttonRef,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: string
  children: ReactNode
  buttonRef?: (node: HTMLButtonElement | null) => void
}) {
  return (
    <CircularIconButton
      {...props}
      buttonRef={buttonRef}
      aria-label={label}
      title={label}
      className={`${styles.button} ${className}`}
      visual={children}
    />
  )
}
