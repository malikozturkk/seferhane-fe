"use client"

import type { ReactNode } from "react"
import { cn } from "../../utils/cn"
import { useControllableState } from "../../utils/hooks"
import styles from "./SegmentedControl.module.css"

export interface SegmentedOption {
  value: string
  /** Visible label. For icon-only options also pass `aria-label`. */
  label: ReactNode
  "aria-label"?: string
  /** Small trailing hint (e.g. "Faz 2"). */
  hint?: ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps {
  options: SegmentedOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /**
   * - `text` — "Günlük / Haftalık" (`.segmented`)
   * - `icon` — list / grid view toggle (`.view-toggle`)
   */
  variant?: "text" | "icon"
  fullWidth?: boolean
  "aria-label": string
  className?: string
}

/** Single-choice button group. */
export function SegmentedControl({
  options,
  value,
  defaultValue,
  onChange,
  variant = "text",
  fullWidth = false,
  className,
  ...props
}: SegmentedControlProps) {
  const [current, setCurrent] = useControllableState(value, defaultValue ?? options[0]?.value, onChange)
  return (
    <div
      role="group"
      aria-label={props["aria-label"]}
      className={cn(styles.group, styles[variant], fullWidth && styles.fullWidth, className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={current === o.value}
          aria-label={o["aria-label"]}
          disabled={o.disabled}
          className={cn(styles.option, current === o.value && styles.active)}
          onClick={() => setCurrent(o.value)}
        >
          {o.label}
          {o.hint && <small>{o.hint}</small>}
        </button>
      ))}
    </div>
  )
}
