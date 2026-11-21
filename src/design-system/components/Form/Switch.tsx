"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "../../utils/cn"
import { useControllableState, useStableId } from "../../utils/hooks"
import styles from "./Form.module.css"

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value" | "defaultValue"> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  /** When set, renders the settings row layout (`.setting-toggle`). */
  label?: ReactNode
  description?: ReactNode
}

/** Toggle switch (`.toggle`, role="switch"). */
export function Switch({
  checked,
  defaultChecked = false,
  onCheckedChange,
  label,
  description,
  className,
  id,
  ...props
}: SwitchProps) {
  const [on, setOn] = useControllableState(checked, defaultChecked, onCheckedChange)
  const labelId = useStableId(id ? `${id}-label` : undefined)
  const descId = `${labelId}-desc`
  const control = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={on}
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={description ? descId : undefined}
      className={cn(styles.switch, !label && className)}
      onClick={() => setOn(!on)}
      {...props}
    >
      <span />
    </button>
  )
  if (!label) return control
  return (
    <div className={cn(styles.switchRow, className)}>
      <div>
        <strong id={labelId}>{label}</strong>
        {description && <span id={descId}>{description}</span>}
      </div>
      {control}
    </div>
  )
}
