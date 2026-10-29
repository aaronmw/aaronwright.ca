import type { ComponentProps, ReactNode } from 'react'
import styles from './MosaicAdjustmentToolbar.module.css'

type FieldProps = { label: string; stacked?: boolean }

function AdjustmentField({
  label,
  stacked,
  children,
}: FieldProps & { children: ReactNode }) {
  return (
    <label className={stacked ? styles.timeField : styles.approachField}>
      {label}
      {children}
    </label>
  )
}

export function AdjustmentInput({
  label,
  stacked,
  className = '',
  ...props
}: FieldProps & ComponentProps<'input'>) {
  return (
    <AdjustmentField
      label={label}
      stacked={stacked}
    >
      <input
        {...props}
        className={`${styles.timeInput} ${className}`}
      />
    </AdjustmentField>
  )
}

export function AdjustmentSelect({
  label,
  stacked,
  className = '',
  ...props
}: FieldProps & ComponentProps<'select'>) {
  return (
    <AdjustmentField
      label={label}
      stacked={stacked}
    >
      <select
        {...props}
        className={`${styles.timeInput} ${className}`}
      />
    </AdjustmentField>
  )
}

export function AdjustmentTextarea({
  label,
  stacked = true,
  className = '',
  ...props
}: FieldProps & ComponentProps<'textarea'>) {
  return (
    <AdjustmentField
      label={label}
      stacked={stacked}
    >
      <textarea
        {...props}
        className={`${styles.timeInput} ${styles.textarea} ${className}`}
      />
    </AdjustmentField>
  )
}
