import { Fragment, type ReactNode } from "react"
import { CheckIcon } from "../../icons"
import { cn } from "../../utils/cn"
import styles from "./Stepper.module.css"

export interface StepperProps {
  steps: ReactNode[]
  /** Zero-based index of the current step. Steps ≤ current are "done" in `progress`. */
  current: number
  /**
   * - `progress` — evenly spaced circles with connectors (`.trip-steps`)
   * - `compact` — inline numbered labels for multi-step forms (`.form-steps`)
   */
  variant?: "progress" | "compact"
  /** Makes steps clickable (progress variant). */
  onStepClick?: (index: number) => void
  "aria-label"?: string
  className?: string
}

export function Stepper({
  steps,
  current,
  variant = "progress",
  onStepClick,
  className,
  ...props
}: StepperProps) {
  if (variant === "compact") {
    return (
      <ol className={cn(styles.compact, className)} aria-label={props["aria-label"]}>
        {steps.map((s, i) => (
          <Fragment key={i}>
            {i > 0 && <li aria-hidden className={styles.connector} />}
            <li className={cn(i <= current && styles.active)} aria-current={i === current ? "step" : undefined}>
              <b>{i + 1}</b>
              {s}
            </li>
          </Fragment>
        ))}
      </ol>
    )
  }
  return (
    <ol className={cn(styles.progress, className)} aria-label={props["aria-label"]}>
      {steps.map((s, i) => {
        const done = i <= current
        const inner = (
          <>
            <span>{done ? <CheckIcon size={13} /> : i + 1}</span>
            <small>{s}</small>
          </>
        )
        return (
          <li key={i} className={cn(done && styles.done)} aria-current={i === current ? "step" : undefined}>
            {onStepClick ? (
              <button type="button" onClick={() => onStepClick(i)}>
                {inner}
              </button>
            ) : (
              <div>{inner}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
