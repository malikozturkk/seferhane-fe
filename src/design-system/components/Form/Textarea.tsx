"use client"

import { forwardRef, type TextareaHTMLAttributes } from "react"
import { cn } from "../../utils/cn"
import { useFieldControl } from "./FormField"
import styles from "./Form.module.css"

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

/** Multi-line input (`.field textarea`). */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, rows = 3, ...props },
  ref,
) {
  const { invalid: _invalid, ...field } = useFieldControl({ ...props, invalid })
  void _invalid
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(styles.control, styles.md, styles.textarea, className)}
      {...props}
      {...field}
    />
  )
})
