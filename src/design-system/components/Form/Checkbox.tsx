"use client"

import { forwardRef, useEffect, useRef, type InputHTMLAttributes, type ReactNode } from "react"
import { CheckIcon } from "../../icons"
import { cn } from "../../utils/cn"
import styles from "./Form.module.css"

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: ReactNode
  description?: ReactNode
  /**
   * - `default` — native 13px checkbox with brand accent (tables, forms)
   * - `task` — checklist item with soft sage box (`.check-item`)
   */
  variant?: "default" | "task"
  indeterminate?: boolean
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, variant = "default", indeterminate = false, className, disabled, ...props },
  forwardedRef,
) {
  const inner = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (inner.current) inner.current.indeterminate = indeterminate
  }, [indeterminate])
  const setRef = (node: HTMLInputElement | null) => {
    inner.current = node
    if (typeof forwardedRef === "function") forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  if (variant === "task") {
    return (
      <label className={cn(styles.choice, styles.task, className)} data-disabled={disabled}>
        <input ref={setRef} type="checkbox" className={styles.srOnly} disabled={disabled} {...props} />
        <span className={styles.taskBox} aria-hidden>
          <CheckIcon size={12} />
        </span>
        {label}
      </label>
    )
  }

  const input = (
    <input
      ref={setRef}
      type="checkbox"
      className={cn(styles.nativeBox, !label && className)}
      disabled={disabled}
      {...props}
    />
  )
  if (!label) return input
  return (
    <label className={cn(styles.choice, className)} data-disabled={disabled}>
      {input}
      <span className={styles.choiceText}>
        {label}
        {description && <span className={styles.choiceDescription}>{description}</span>}
      </span>
    </label>
  )
})
