import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "../../utils/cn"
import styles from "./StatusIndicator.module.css"

export type StatusIndicatorStatus = "live" | "off" | "warning" | "danger"

export interface StatusIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  status?: StatusIndicatorStatus
  /** sm = 4px (footer), md = 6px (topbar/overview) */
  size?: "sm" | "md"
  /** Optional text next to the dot. */
  label?: ReactNode
}

/** `.live-dot` + optional label ("Tüm sistemler normal çalışıyor"). */
export function StatusIndicator({
  status = "live",
  size = "md",
  label,
  className,
  ...props
}: StatusIndicatorProps) {
  const dot = (
    <span
      className={cn(styles.dot, styles[status], styles[size], !label && className)}
      aria-hidden={label ? true : undefined}
      role={label ? undefined : "img"}
      aria-label={label ? undefined : status}
      {...(label ? {} : props)}
    />
  )
  if (!label) return dot
  return (
    <span className={cn(styles.wrap, className)} {...props}>
      {dot}
      {label}
    </span>
  )
}
