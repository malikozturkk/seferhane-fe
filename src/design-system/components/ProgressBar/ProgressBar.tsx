import type { ReactNode } from "react"
import { cn } from "../../utils/cn"
import styles from "./ProgressBar.module.css"

export interface ProgressBarProps {
  /** Current value (0 – max). */
  value: number
  max?: number
  /** Text above the bar, left. */
  label?: ReactNode
  /** Text above the bar, right (e.g. "%64" or "3 / 4"). */
  valueLabel?: ReactNode
  /** sm = 4px (document progress) · md = 5px · lg = 20px (analysis bars) */
  size?: "sm" | "md" | "lg"
  /** Fill color — any CSS color / token var. Default sage. */
  color?: string
  /** `boxed` wraps the bar in the soft sage card (`.document-progress`). */
  variant?: "plain" | "boxed"
  /** Accessible label when no visible `label` is given. */
  "aria-label"?: string
  className?: string
}

/** Linear progress (`.progress`, `.document-progress`, `.usage-item`). */
export function ProgressBar({
  value,
  max = 100,
  label,
  valueLabel,
  size = "md",
  color,
  variant = "plain",
  className,
  ...props
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100))
  return (
    <div className={cn(styles.root, styles[variant], className)}>
      {(label || valueLabel) && (
        <div className={styles.header}>
          {label && <span>{label}</span>}
          {valueLabel && <b>{valueLabel}</b>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={typeof label === "string" ? label : props["aria-label"]}
        className={cn(styles.track, styles[size])}
      >
        <i style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
