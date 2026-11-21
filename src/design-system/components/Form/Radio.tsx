"use client"

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react"
import { cn } from "../../utils/cn"
import { useStableId } from "../../utils/hooks"
import styles from "./Form.module.css"

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: ReactNode
  description?: ReactNode
}

/**
 * Radio button. Not present in the reference design — styled like the
 * native checkbox (13px, brand accent) for consistency.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, description, className, disabled, ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      type="radio"
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

export interface RadioGroupProps {
  name?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  options: Array<{ value: string; label: ReactNode; description?: ReactNode; disabled?: boolean }>
  /** Accessible group label. */
  label: string
  direction?: "row" | "column"
  className?: string
}

export function RadioGroup({
  name,
  value,
  defaultValue,
  onChange,
  options,
  label,
  direction = "column",
  className,
}: RadioGroupProps) {
  const groupName = useStableId(name)
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={className}
      style={{ display: "flex", flexDirection: direction, gap: direction === "row" ? 16 : 12 }}
    >
      {options.map((o) => (
        <Radio
          key={o.value}
          name={groupName}
          value={o.value}
          label={o.label}
          description={o.description}
          disabled={o.disabled}
          {...(value !== undefined
            ? { checked: value === o.value }
            : { defaultChecked: defaultValue === o.value })}
          onChange={() => onChange?.(o.value)}
        />
      ))}
    </div>
  )
}
