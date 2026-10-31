import type { ComponentProps } from 'react'
import { PortfolioIcon, type PortfolioIconName } from './PortfolioIcon'
import styles from './PortfolioActionLink.module.css'

type PortfolioActionLinkProps = Omit<ComponentProps<'a'>, 'target' | 'rel'> & {
  href: string
  variant?: 'filled'
  tone?: 'accent' | 'linkedin' | 'figma'
  leadingIcon?: PortfolioIconName
  trailingIcon?: PortfolioIconName
  external?: boolean
}

/** Filled navigation actions share geometry; their destinations own the tone. */
export function PortfolioActionLink({
  variant = 'filled',
  tone = 'accent',
  leadingIcon,
  trailingIcon,
  external = false,
  children,
  className,
  ...props
}: PortfolioActionLinkProps) {
  return (
    <a
      {...props}
      className={`${styles[variant]} ${className ?? ''}`}
      data-tone={tone}
      data-leading-icon={leadingIcon ? true : undefined}
      data-trailing-icon={trailingIcon ? true : undefined}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
    >
      {leadingIcon ? (
        <span className={styles.iconSlot}>
          <PortfolioIcon name={leadingIcon} />
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
      {trailingIcon ? (
        <span className={styles.iconSlot}>
          <PortfolioIcon name={trailingIcon} />
        </span>
      ) : null}
      {external ? (
        <span className="sr-only"> (opens in a new tab)</span>
      ) : null}
    </a>
  )
}
