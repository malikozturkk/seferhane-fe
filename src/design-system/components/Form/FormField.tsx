"use client"

import { createContext, useContext, type ReactNode } from "react"
import { cn } from "../../utils/cn"
import { useStableId } from "../../utils/hooks"
import styles from "./Form.module.css"

interface FieldContextValue {
  id: string
  describedBy?: string
  invalid: boolean
  required: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

/** Used by form controls to pick up id / aria wiring from a parent FormField. */
export function useFieldControl(props: {
  id?: string
  invalid?: boolean
  required?: boolean
  "aria-describedby"?: string
}) {
  const ctx = useContext(FieldContext)
  const invalid = props.invalid ?? ctx?.invalid ?? false
  return {
    id: props.id ?? ctx?.id,
    required: props.required ?? ctx?.required,
    "aria-invalid": invalid || undefined,
    "aria-describedby":
      [props["aria-describedby"], ctx?.describedBy].filter(Boolean).join(" ") || undefined,
    invalid,
  }
}

export interface FormFieldProps {
  label: ReactNode
  children: ReactNode
  /** Helper text under the control (`.field-help`). */
  hint?: ReactNode
  /** Error message — also flags the control as invalid. */
  error?: ReactNode
  /** Appends a muted "(isteğe bağlı)" marker. */
  optional?: boolean | string
  required?: boolean
  id?: string
  className?: string
  /** Remove the default 19px bottom margin (inline/grid usage). */
  flush?: boolean
}

/** Label + control + hint/error (`.field`). */
export function FormField({
  label,
  children,
  hint,
  error,
  optional,
  required = false,
  id,
  className,
  flush = false,
}: FormFieldProps) {
  const controlId = useStableId(id)
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  return (
    <FieldContext.Provider
      value={{
        id: controlId,
        describedBy: [errorId, hintId].filter(Boolean).join(" ") || undefined,
        invalid: Boolean(error),
        required,
      }}
    >
      <div className={cn(styles.field, flush && styles.flush, className)}>
        <label htmlFor={controlId} className={styles.label}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden>
              *
            </span>
          )}
          {optional && (
            <small className={styles.optional}>
              {typeof optional === "string" ? optional : "(isteğe bağlı)"}
            </small>
          )}
        </label>
        {children}
        {error ? (
          <span id={errorId} className={styles.error} role="alert">
            {error}
          </span>
        ) : null}
        {hint ? (
          <span id={hintId} className={styles.hint}>
            {hint}
          </span>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}

/** Two-column responsive grid for fields (`.form-grid`). */
export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(styles.grid, className)}>{children}</div>
}
