"use client"

import {
  cloneElement,
  isValidElement,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react"
import { cn } from "../../utils/cn"
import { useStableId } from "../../utils/hooks"
import styles from "./Tooltip.module.css"

type TriggerProps = {
  "aria-describedby"?: string
  onMouseEnter?: (e: MouseEvent) => void
  onMouseLeave?: (e: MouseEvent) => void
  onFocus?: (e: FocusEvent) => void
  onBlur?: (e: FocusEvent) => void
}

export interface TooltipProps {
  /** Tooltip body. Use `title` + `content` for the two-line chart style. */
  content: ReactNode
  title?: ReactNode
  /** Single focusable element (button, link…). */
  children: ReactElement<TriggerProps>
  side?: "top" | "bottom"
  className?: string
}

/**
 * Hover/focus tooltip. Visual language taken from the reference's chart
 * tooltip (`.chart-tooltip`); a general tooltip is not present in the design.
 */
export function Tooltip({ content, title, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const id = useStableId()
  if (!isValidElement(children)) return children
  const p = children.props
  const trigger = cloneElement(children, {
    "aria-describedby": [p["aria-describedby"], open ? id : null].filter(Boolean).join(" ") || undefined,
    onMouseEnter: (e: MouseEvent) => (p.onMouseEnter?.(e), setOpen(true)),
    onMouseLeave: (e: MouseEvent) => (p.onMouseLeave?.(e), setOpen(false)),
    onFocus: (e: FocusEvent) => (p.onFocus?.(e), setOpen(true)),
    onBlur: (e: FocusEvent) => (p.onBlur?.(e), setOpen(false)),
  })
  return (
    <span
      className={styles.wrap}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false)
      }}
    >
      {trigger}
      {open && (
        <span id={id} role="tooltip" className={cn(styles.tooltip, styles[side], className)}>
          {title && <span className={styles.title}>{title}</span>}
          <strong>{content}</strong>
        </span>
      )}
    </span>
  )
}
