"use client"

import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "../../utils/cn"
import { useFieldControl } from "./FormField"
import styles from "./Form.module.css"

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** md = form field · sm = inline form row (`.inline-form input`) */
  size?: "sm" | "md"
  invalid?: boolean
}

/** Text input (`.field input`). Picks up id/aria from a parent `FormField`. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", invalid, className, ...props },
  ref,
) {
  const { invalid: _invalid, ...field } = useFieldControl({ ...props, invalid })
  void _invalid
  return (
    <input
      ref={ref}
      className={cn(styles.control, styles[size], className)}
      {...props}
      {...field}
    />
  )
})
