'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheck,
  faDesktop,
  faMoon,
  faSun,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons'
import { usePortfolioTheme } from './PortfolioThemeProvider'
import type { PortfolioThemePreference } from './domain/appearance'

type PortfolioThemeMenuProps = {
  hidden: boolean
  isTouchInput: boolean
  isTouchLandscapeLayout: boolean
  isWideLayout: boolean
}

type PopoverElement = HTMLDivElement & {
  hidePopover: () => void
  showPopover: () => void
}

const THEME_OPTIONS: Array<{
  icon: IconDefinition
  label: string
  value: PortfolioThemePreference
}> = [
  { value: 'system', label: 'System', icon: faDesktop },
  { value: 'light', label: 'Light', icon: faSun },
  { value: 'dark', label: 'Dark', icon: faMoon },
]

const TRIGGER_ICONS: Record<PortfolioThemePreference, IconDefinition> = {
  system: faDesktop,
  light: faSun,
  dark: faMoon,
}

function isPopoverOpen(popover: PopoverElement | null) {
  return popover?.matches(':popover-open') ?? false
}

function getControlPosition({
  isTouchInput,
  isTouchLandscapeLayout,
  isWideLayout,
}: Omit<PortfolioThemeMenuProps, 'hidden'>): CSSProperties {
  if (isTouchInput && !isWideLayout && !isTouchLandscapeLayout) {
    return {
      top: 'max(0.125rem, env(safe-area-inset-top, 0px))',
      right:
        'max(0.8125rem, calc(env(safe-area-inset-right, 0px) + 0.8125rem))',
    }
  }

  if (isTouchLandscapeLayout) {
    return {
      top: 'max(0.5rem, env(safe-area-inset-top, 0px))',
      right:
        'max(0.625rem, calc(env(safe-area-inset-right, 0px) + 0.625rem))',
    }
  }

  if (isWideLayout) {
    return {
      top: '3.75rem',
      right: 'calc(1.75rem + env(safe-area-inset-right, 0px))',
    }
  }

  return {
    top: 'max(1.25rem, env(safe-area-inset-top, 0px))',
    right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
  }
}

export function PortfolioThemeMenu({
  hidden,
  isTouchInput,
  isTouchLandscapeLayout,
  isWideLayout,
}: PortfolioThemeMenuProps) {
  const { preference, setPreference } = usePortfolioTheme()
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<PopoverElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(() =>
    THEME_OPTIONS.findIndex(option => option.value === preference),
  )

  const focusOption = useCallback((index: number) => {
    const normalizedIndex =
      (index + THEME_OPTIONS.length) % THEME_OPTIONS.length
    setFocusedIndex(normalizedIndex)
    optionRefs.current[normalizedIndex]?.focus()
  }, [])

  const closeMenu = useCallback((restoreFocus: boolean) => {
    const popover = popoverRef.current
    if (isPopoverOpen(popover)) {
      popover?.hidePopover()
    }

    if (restoreFocus) {
      triggerRef.current?.focus()
    }
  }, [])

  const openMenu = useCallback(() => {
    const trigger = triggerRef.current
    const popover = popoverRef.current
    if (!trigger || !popover) {
      return
    }

    const triggerRect = trigger.getBoundingClientRect()
    const selectedIndex = Math.max(
      0,
      THEME_OPTIONS.findIndex(option => option.value === preference),
    )
    popover.style.setProperty(
      '--portfolio-theme-menu-top',
      `${triggerRect.bottom + 8}px`,
    )
    popover.style.setProperty(
      '--portfolio-theme-menu-right',
      `${Math.max(8, window.innerWidth - triggerRect.right)}px`,
    )
    setFocusedIndex(selectedIndex)
    popover.showPopover()
    requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus())
  }, [preference])

  useEffect(() => {
    const popover = popoverRef.current
    if (!popover) {
      return
    }

    const handleToggle = () => setIsOpen(isPopoverOpen(popover))
    popover.addEventListener('toggle', handleToggle)
    return () => popover.removeEventListener('toggle', handleToggle)
  }, [])

  useEffect(() => {
    if (hidden) {
      closeMenu(false)
    }
  }, [closeMenu, hidden])

  const selectPreference = (nextPreference: PortfolioThemePreference) => {
    setPreference(nextPreference)
    closeMenu(true)
  }

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        event.stopPropagation()
        focusOption(index + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        event.stopPropagation()
        focusOption(index - 1)
        break
      case 'Home':
        event.preventDefault()
        event.stopPropagation()
        focusOption(0)
        break
      case 'End':
        event.preventDefault()
        event.stopPropagation()
        focusOption(THEME_OPTIONS.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        event.stopPropagation()
        selectPreference(THEME_OPTIONS[index].value)
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        closeMenu(true)
        break
      case 'Tab':
        closeMenu(false)
        break
    }
  }

  const triggerLabel = `Appearance: ${
    THEME_OPTIONS.find(option => option.value === preference)?.label ?? 'System'
  }`

  return (
    <div
      className="portfolio-theme-control"
      data-interactive-pop="off"
      hidden={hidden}
      style={getControlPosition({
        isTouchInput,
        isTouchLandscapeLayout,
        isWideLayout,
      })}
    >
      <button
        ref={triggerRef}
        type="button"
        className="portfolio-theme-trigger"
        aria-label={triggerLabel}
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        data-portfolio-theme-trigger
        data-portfolio-theme-icon={preference}
        title={triggerLabel}
        onClick={() => {
          if (isPopoverOpen(popoverRef.current)) {
            closeMenu(true)
          } else {
            openMenu()
          }
        }}
      >
        <FontAwesomeIcon
          icon={TRIGGER_ICONS[preference]}
          className="size-[1.0625rem]"
          aria-hidden="true"
        />
      </button>
      <div
        ref={popoverRef}
        id={menuId}
        popover="auto"
        role="menu"
        aria-label="Appearance"
        className="portfolio-theme-menu"
        data-portfolio-theme-menu
      >
        {THEME_OPTIONS.map((option, index) => {
          const checked = preference === option.value

          return (
            <button
              key={option.value}
              ref={node => {
                optionRefs.current[index] = node
              }}
              type="button"
              role="menuitemradio"
              aria-checked={checked}
              className="portfolio-theme-menu-item"
              data-portfolio-theme-option={option.value}
              tabIndex={isOpen && focusedIndex === index ? 0 : -1}
              onFocus={() => setFocusedIndex(index)}
              onKeyDown={event => handleOptionKeyDown(event, index)}
              onClick={() => selectPreference(option.value)}
            >
              <span className="portfolio-theme-menu-check" aria-hidden="true">
                <FontAwesomeIcon
                  icon={faCheck}
                  className={`size-3.5 transition-opacity duration-150 motion-reduce:transition-none ${
                    checked ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </span>
              <FontAwesomeIcon
                icon={option.icon}
                className="size-3.5"
                aria-hidden="true"
              />
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
