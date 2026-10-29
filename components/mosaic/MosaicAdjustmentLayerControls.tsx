import { useId, useState } from 'react'
import { AdjustmentInput, AdjustmentSelect } from './MosaicAdjustmentField'
import { blendModes, type MosaicLayerSettings } from './MosaicAdjustmentLayer'
import controls from './MosaicAdjustmentToolbar.module.css'

export function MosaicAdjustmentLayerControls({
  settings,
  change,
}: {
  settings: MosaicLayerSettings
  change: (settings: MosaicLayerSettings) => void
}) {
  const [colour, setColour] = useState(settings.colour)
  const [invalid, setInvalid] = useState(false)
  const errorId = useId()
  return (
    <div className={controls.layerControls}>
      <AdjustmentSelect
        label="Blend Mode"
        value={settings.blendMode}
        onChange={event =>
          change({
            ...settings,
            blendMode: event.currentTarget
              .value as MosaicLayerSettings['blendMode'],
          })
        }
      >
        {blendModes.map(mode => (
          <option
            key={mode}
            value={mode}
          >
            {mode}
          </option>
        ))}
      </AdjustmentSelect>
      <AdjustmentInput
        label="Adjustment Layer Colour"
        className={controls.colourInput}
        value={colour}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        onChange={event => {
          const draft = event.currentTarget.value
          const value = draft.trim() || 'transparent'
          const valid = CSS.supports('color', value)
          setColour(draft)
          setInvalid(!valid)
          if (valid) change({ ...settings, colour: value })
        }}
      />
      {invalid ? (
        <span
          id={errorId}
          role="status"
        >
          Enter a valid CSS colour.
        </span>
      ) : null}
    </div>
  )
}
