"use client"

import { forwardRef, type SelectHTMLAttributes } from "react"
import { cn } from "../../utils/cn"
import { useFieldControl } from "./FormField"
import styles from "./Form.module.css"

export type SelectOption = string | { value: string; label: string; disabled?: boolean }

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options?: SelectOption[]
  /** `field` = full-width form select · `compact` = panel header filter (`.small-select`) */
  variant?: "field" | "compact"
  placeholder?: string
  invalid?: boolean
}

/**
 * Native select — the reference design uses native `<select>` everywhere
 * (keyboard & mobile pickers for free).
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, variant = "field", placeholder, invalid, className, children, ...props },
  ref,
) {
  const { invalid: _invalid, ...field } = useFieldControl({ ...props, invalid })
  void _invalid
  return (
    <select
      ref={ref}
      className={cn(
        variant === "field" ? cn(styles.control, styles.md) : styles.selectSmall,
        className,
      )}
      {...props}
      {...field}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options?.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ),
      )}
      {children}
    </select>
  )
})
