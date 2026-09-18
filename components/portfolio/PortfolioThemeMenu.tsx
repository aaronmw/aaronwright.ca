'use client'

import { useState, type CSSProperties } from 'react'
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  type Selection,
} from 'react-aria-components'
import { portfolioFont } from '@/lib/portfolioFonts'
import { usePortfolioTheme } from './PortfolioThemeProvider'
import type { PortfolioThemePreference } from './domain/appearance'
import { FiveByFive } from './presentation/FiveByFive'
import { PortfolioIcon, type PortfolioIconName } from './presentation/PortfolioIcon'

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
  if (hidden) return null

  const triggerLabel = `Appearance: ${
    THEME_OPTIONS.find(option => option.value === preference)?.label ?? 'System'
  }`
  const handleSelection = (keys: Selection) => {
    if (keys === 'all') return
    const selected = Array.from(keys)[0]
    if (selected === 'system' || selected === 'light' || selected === 'dark') {
      setPreference(selected)
    }
  }

  return (
    <div
      className="portfolio-theme-control font-portfolio-controls"
      data-interactive-pop="off"
      style={getControlPosition()}
    >
      {open ? (
        <span
          className="pointer-events-none fixed inset-0 z-[var(--portfolio-layer-scrim)] bg-portfolio-overlay"
          data-portfolio-theme-menu-scrim
          aria-hidden="true"
        />
      ) : null}
      <MenuTrigger
        isOpen={open}
        onOpenChange={setOpen}
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
          placement="bottom end"
          offset={0}
          className={`portfolio-theme-menu portfolio-typography ${portfolioFont.className}`}
          style={{ zIndex: 'var(--portfolio-layer-menu)' }}
          data-portfolio-theme-menu
        >
          <Menu
            aria-label="Appearance"
            selectionMode="single"
            selectedKeys={new Set([preference])}
            onSelectionChange={handleSelection}
          >
            {THEME_OPTIONS.map(option => (
              <MenuItem
                key={option.value}
                id={option.value}
                className="portfolio-theme-menu-item"
                data-portfolio-theme-option={option.value}
                textValue={option.label}
              >
                {({ isSelected }) => (
                  <>
                    <span
                      className="portfolio-theme-menu-check"
                      aria-hidden="true"
                    >
                      <FiveByFive
                        variant="dot"
                        className={`transition-opacity duration-[var(--portfolio-motion-feedback)] motion-reduce:transition-none ${
                          isSelected ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    </span>
                    <span className="portfolio-theme-menu-label">
                      {option.label}
                    </span>
                    <span className="grid size-[var(--portfolio-control-size)] place-items-center">
                      <PortfolioIcon
                        name={option.icon}
                        className="text-portfolio-accent-decoration"
                      />
                    </span>
                  </>
                )}
              </MenuItem>
            ))}
          </Menu>
        </Popover>
      </MenuTrigger>
    </div>
  )
}
