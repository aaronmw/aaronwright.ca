import type { ComponentProps } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { FiveByFive } from '../portfolio/presentation/FiveByFive'
import styles from './MosaicAdjustmentToolbar.module.css'

export function AdjustmentButton({
  children,
  pending,
  icon,
  iconOnly = false,
  className,
  ...props
}: ComponentProps<'button'> & {
  pending?: boolean
  icon?: IconDefinition
  iconOnly?: boolean
}) {
  return (
    <button
      {...props}
      type="button"
      className={`${styles.button} ${iconOnly ? styles.iconOnly : ''} ${className ?? ''}`}
      disabled={pending || props.disabled}
      aria-busy={pending || undefined}
    >
      {icon ? (
        <span className={styles.icon}>
          {pending ? (
            <FiveByFive
              variant="snake"
              cellSize="3px"
            />
          ) : (
            <FontAwesomeIcon
              icon={icon}
              aria-hidden="true"
            />
          )}
        </span>
      ) : null}
      {children}
    </button>
  )
}
