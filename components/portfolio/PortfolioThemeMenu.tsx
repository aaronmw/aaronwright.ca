'use client'

import { useCallback, useRef, useState, type CSSProperties } from 'react'
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  type Key,
} from 'react-aria-components'
import { portfolioFont } from '@/lib/portfolioFonts'
import { usePortfolioTheme } from './PortfolioThemeProvider'
import type { PortfolioThemePreference } from './domain/appearance'
import {
  PortfolioIcon,
  type PortfolioIconName,
} from './presentation/PortfolioIcon'

type PortfolioThemeMenuProps = {
  hidden: boolean
  isTouchInput: boolean
  isTouchLandscapeLayout: boolean
  isWideLayout: boolean
}

const THEME_OPTIONS: Array<{
  icon: Extract<PortfolioIconName, 'system' | 'light' | 'dark'>
  label: string
  value: PortfolioThemePreference
}> = [
  { value: 'system', label: 'System', icon: 'system' },
  { value: 'light', label: 'Light', icon: 'light' },
  { value: 'dark', label: 'Dark', icon: 'dark' },
]

function getControlPosition(): CSSProperties {
  return {
    top: 'var(--portfolio-theme-control-edge-inset)',
    right:
      'calc(var(--portfolio-navigation-control-edge-offset) + env(safe-area-inset-right, 0px))',
  }
}

export function PortfolioThemeMenu({ hidden }: PortfolioThemeMenuProps) {
  const { preference, setPreference } = usePortfolioTheme()
  const [open, setOpen] = useState(false)
  const pendingPreference = useRef<PortfolioThemePreference | null>(null)
  const pointerStartedInMenu = useRef(false)
  const releasedFromOutside = useRef(false)
  const handlePopoverRef = useCallback(
    (element: HTMLDivElement | null) => {
      // React Aria detaches the popover after its exit transition (or immediately
      // with reduced motion). Keep its order and colors unchanged until then.
      if (element || pendingPreference.current === null) return
      const selected = pendingPreference.current
      pendingPreference.current = null
      setPreference(selected)
    },
    [setPreference],
  )
  if (hidden) return null

  const activeOption =
    THEME_OPTIONS.find(option => option.value === preference) ??
    THEME_OPTIONS[0]
  const menuOptions = [
    activeOption,
    ...THEME_OPTIONS.filter(option => option.value !== activeOption.value),
  ]
  const triggerLabel = `Appearance: ${activeOption.label}`
  const handleSelection = (selected: Key) => {
    // Ignore the opening mouse-up on the overlapping current row, while keeping
    // fresh clicks, keyboard activation, and dragging to another option usable.
    const openingRelease = releasedFromOutside.current
    releasedFromOutside.current = false
    if (
      (openingRelease && selected === preference) ||
      pendingPreference.current !== null
    ) {
      return
    }
    if (selected === 'system' || selected === 'light' || selected === 'dark') {
      pendingPreference.current = selected
      setOpen(false)
    }
  }

  return (
    <div
      className="portfolio-theme-control font-portfolio-controls"
      data-interactive-pop="off"
      style={getControlPosition()}
    >
      <span
        className="portfolio-theme-menu-scrim pointer-events-none fixed inset-0 z-[var(--portfolio-layer-scrim)] bg-portfolio-overlay"
        data-portfolio-theme-menu-scrim
        data-open={open ? '' : undefined}
        aria-hidden="true"
      />
      <MenuTrigger
        isOpen={open}
        onOpenChange={nextOpen => {
          if (nextOpen && pendingPreference.current !== null) return
          pointerStartedInMenu.current = false
          releasedFromOutside.current = false
          setOpen(nextOpen)
        }}
      >
        <Button
          className="portfolio-theme-trigger"
          aria-label={triggerLabel}
          data-portfolio-theme-trigger
          data-portfolio-theme-icon={preference}
          data-portfolio-theme-menu-open={open ? '' : undefined}
        >
          <PortfolioIcon
            name={preference}
            className="text-portfolio-accent-decoration"
          />
        </Button>
        <Popover
          ref={handlePopoverRef}
          placement="bottom end"
          offset={0}
          containerPadding={0}
          shouldFlip={false}
          className={`portfolio-theme-menu portfolio-typography ${portfolioFont.className}`}
          style={{ zIndex: 'var(--portfolio-layer-menu)' }}
          data-portfolio-theme-menu
        >
          <Menu
            aria-label="Appearance"
            selectionMode="single"
            selectedKeys={new Set([preference])}
            onAction={handleSelection}
            onPointerDownCapture={() => {
              pointerStartedInMenu.current = true
            }}
            onPointerUpCapture={() => {
              releasedFromOutside.current = !pointerStartedInMenu.current
              pointerStartedInMenu.current = false
            }}
          >
            {menuOptions.map(option => (
              <MenuItem
                key={option.value}
                id={option.value}
                shouldCloseOnSelect={false}
                className="portfolio-theme-menu-item"
                data-portfolio-theme-option={option.value}
                textValue={option.label}
              >
                <span className="portfolio-theme-menu-label">
                  {option.label}
                </span>
                <span className="grid size-[var(--portfolio-control-size)] place-items-center">
                  <PortfolioIcon
                    name={option.icon}
                    className="text-portfolio-accent-decoration"
                  />
                </span>
              </MenuItem>
            ))}
          </Menu>
        </Popover>
      </MenuTrigger>
    </div>
  )
}
