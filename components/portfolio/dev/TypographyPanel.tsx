'use client'

import { useId, useState, type ReactNode } from 'react'
import {
  Button,
  ComboBox,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  NumberField,
  Popover,
} from 'react-aria-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronDown,
  faFont,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import {
  FONT_SIZE_LIMITS,
  LINE_HEIGHT_LIMITS,
  TRACKING_LIMITS,
} from './typographyPreview'
import { useTypographyPreview } from './useTypographyPreview'
import styles from './TypographyPanel.module.css'

const MONOSPACE_FONTS = [
  'Courier Prime',
  'IBM Plex Mono',
  'JetBrains Mono',
  'Fira Code',
  'Roboto Mono',
  'Space Mono',
  'Inconsolata',
  'Source Code Pro',
  'Geist Mono',
]
const INPUT_CLASS =
  'w-full min-w-0 rounded border border-portfolio-text-dimmed bg-portfolio-surface px-3 py-2 text-base text-portfolio-text outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portfolio-accent disabled:opacity-60'
const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded border border-portfolio-text-dimmed bg-portfolio-shaded px-3 py-2 text-portfolio-text outline-none hover:border-portfolio-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portfolio-accent disabled:opacity-60'

function PendingButton({
  children,
  pending,
  onPress,
  type = 'button',
}: {
  children: ReactNode
  pending: boolean
  onPress?: () => void
  type?: 'button' | 'submit'
}) {
  return (
    <Button
      type={type}
      onPress={onPress}
      isPending={pending}
      className={BUTTON_CLASS}
    >
      <span
        className="relative size-3.5 shrink-0"
        aria-hidden="true"
      >
        <FontAwesomeIcon
          icon={faFont}
          className={`absolute inset-0 size-3.5 transition-opacity motion-reduce:transition-none ${pending ? 'opacity-0' : 'opacity-100'}`}
        />
        <FontAwesomeIcon
          icon={faSpinner}
          className={`absolute inset-0 size-3.5 animate-spin transition-opacity motion-reduce:animate-none motion-reduce:transition-none ${pending ? 'opacity-100' : 'opacity-0'}`}
        />
      </span>
      {children}
    </Button>
  )
}

export default function TypographyPanel() {
  const { settings, recentFonts, loadState, updateSettings, applyFont, reset } =
    useTypographyPreview()
  const [fontDraft, setFontDraft] = useState<string | null>(null)
  const [copyState, setCopyState] = useState({ pending: false, message: '' })
  const fontHintId = useId()
  const suggestions = Array.from(new Set([...recentFonts, ...MONOSPACE_FONTS]))

  async function copySettings() {
    setCopyState({ pending: true, message: '' })
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            format: 'aaronwright-typography/v1',
            ...settings,
          },
          null,
          2,
        ),
      )
      setCopyState({ pending: false, message: 'Typography settings copied.' })
    } catch {
      setCopyState({
        pending: false,
        message: 'Clipboard access is unavailable in this browser.',
      })
    }
  }

  return (
    <details
      className={`${styles.panel} fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-[var(--portfolio-layer-menu)] max-h-[calc(100dvh-2rem)] w-[min(24rem,calc(100vw-2rem))] overflow-auto overscroll-contain rounded-lg border border-portfolio-text-dimmed bg-portfolio-surface text-portfolio-text shadow-xl`}
      data-portfolio-dev-tools
      data-portfolio-native-wheel-scroll
      data-portfolio-carousel-drag-lock
      data-interactive-pop="off"
    >
      <summary className="cursor-pointer px-4 py-3 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-portfolio-accent">
        Typography{' '}
        <span className="ml-2 text-xs text-portfolio-text-dimmed">DEV</span>
      </summary>
      <div className="space-y-4 border-t border-portfolio-shaded p-4">
        <form
          className="space-y-3"
          onSubmit={async event => {
            event.preventDefault()
            setCopyState(current => ({ ...current, message: '' }))
            if (await applyFont(fontDraft ?? settings.fontFamily))
              setFontDraft(null)
          }}
        >
          <ComboBox
            inputValue={fontDraft ?? settings.fontFamily}
            onInputChange={setFontDraft}
            allowsCustomValue
            isDisabled={loadState.pending}
            className="space-y-1"
          >
            <Label className="block font-bold">Google font family</Label>
            <div className="relative">
              <Input
                aria-describedby={fontHintId}
                className={`${INPUT_CLASS} pr-12`}
              />
              <Button
                type="button"
                aria-label="Show font suggestions"
                className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r text-portfolio-text outline-none hover:bg-portfolio-shaded focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-portfolio-accent disabled:opacity-60"
              >
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="size-3"
                  aria-hidden="true"
                />
              </Button>
            </div>
            <Popover
              placement="bottom start"
              offset={4}
              className={`${styles.panel} z-[calc(var(--portfolio-layer-menu)+1)] max-h-[min(15rem,var(--available-height))] w-[var(--trigger-width)] overflow-auto overscroll-contain rounded border border-portfolio-text-dimmed bg-portfolio-surface text-portfolio-text shadow-xl`}
              data-portfolio-dev-tools
              data-portfolio-native-wheel-scroll
              data-portfolio-carousel-drag-lock
              data-interactive-pop="off"
            >
              <ListBox className="p-1 outline-none">
                {suggestions.map(font => (
                  <ListBoxItem
                    key={font}
                    id={font}
                    textValue={font}
                    className="cursor-pointer rounded px-3 py-2 outline-none data-focused:bg-portfolio-shaded data-selected:text-portfolio-accent"
                  >
                    {font}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </ComboBox>
          <p
            id={fontHintId}
            className="text-portfolio-text-dimmed"
          >
            Choose a suggestion or type any Google font family, then apply it.
            Suggestions include monospace fonts and recent choices.
          </p>
          <PendingButton
            type="submit"
            pending={loadState.pending}
          >
            Apply font
          </PendingButton>
        </form>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            value={settings.fontSize}
            onChange={fontSize => {
              if (Number.isFinite(fontSize)) updateSettings({ fontSize })
            }}
            minValue={FONT_SIZE_LIMITS.min}
            maxValue={FONT_SIZE_LIMITS.max}
            step={0.5}
            className="min-w-0 space-y-1"
          >
            <Label className="block font-bold">Font size (px)</Label>
            <Input
              inputMode="decimal"
              className={INPUT_CLASS}
            />
          </NumberField>
          <NumberField
            value={settings.fontWeight}
            onChange={fontWeight => {
              if (Number.isFinite(fontWeight)) updateSettings({ fontWeight })
            }}
            minValue={100}
            maxValue={900}
            step={100}
            formatOptions={{ maximumFractionDigits: 0 }}
            className="min-w-0 space-y-1"
          >
            <Label className="block font-bold">Font weight</Label>
            <Input
              inputMode="numeric"
              className={INPUT_CLASS}
            />
          </NumberField>
          <NumberField
            value={settings.lineHeight}
            onChange={lineHeight => {
              if (Number.isFinite(lineHeight)) updateSettings({ lineHeight })
            }}
            minValue={LINE_HEIGHT_LIMITS.min}
            maxValue={LINE_HEIGHT_LIMITS.max}
            step={0.025}
            formatOptions={{ maximumFractionDigits: 3 }}
            className="min-w-0 space-y-1"
          >
            <Label className="block font-bold">Line height (×)</Label>
            <Input
              inputMode="decimal"
              className={INPUT_CLASS}
            />
          </NumberField>
          <NumberField
            value={settings.tracking}
            onChange={tracking => {
              if (Number.isFinite(tracking)) updateSettings({ tracking })
            }}
            minValue={TRACKING_LIMITS.min}
            maxValue={TRACKING_LIMITS.max}
            step={0.005}
            formatOptions={{ maximumFractionDigits: 3 }}
            className="min-w-0 space-y-1"
          >
            <Label className="block font-bold">Tracking (em)</Label>
            <Input
              inputMode="text"
              className={INPUT_CLASS}
            />
          </NumberField>
        </div>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 font-bold">
          <input
            type="checkbox"
            checked={settings.prettyText}
            onChange={event =>
              updateSettings({ prettyText: event.target.checked })
            }
            className="size-4 accent-portfolio-accent"
          />
          Pretty text
        </label>
        <p className="text-portfolio-text-dimmed">
          {settings.fontFamily} · {settings.fontSize}px /{' '}
          {Number((settings.fontSize * settings.lineHeight).toFixed(2))}px ·{' '}
          {settings.fontWeight} weight · {settings.tracking}em tracking
        </p>
        <p className="text-portfolio-text-dimmed">
          Weight changes the base text. If a font lacks a weight, the browser
          uses its closest available match.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            className={BUTTON_CLASS}
            onPress={() => {
              reset()
              setFontDraft(null)
              setCopyState(current => ({ ...current, message: '' }))
            }}
          >
            Reset
          </Button>
          <PendingButton
            pending={copyState.pending}
            onPress={() => {
              void copySettings()
            }}
          >
            Copy settings
          </PendingButton>
        </div>
        <p
          role="status"
          className="min-h-5 text-portfolio-text-dimmed"
        >
          {copyState.message ||
            loadState.message ||
            'Changes stay in this browser and apply only in development.'}
        </p>
      </div>
    </details>
  )
}
