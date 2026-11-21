import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "../../utils/cn"
import styles from "./Badge.module.css"

export type BadgeTone = "green" | "blue" | "amber" | "red"

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** green = tamamlandı/geçerli · blue = yolda/planlandı · amber = bekliyor · red = süresi doldu/hata */
  tone?: BadgeTone
  /** Leading dot (default true). */
  dot?: boolean
  size?: "sm" | "md"
  children: ReactNode
}

/** Status badge (`.badge`). */
export function Badge({
  tone = "green",
  dot = true,
  size = "md",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(styles.badge, styles[tone], styles[size], className)} {...props}>
      {dot && <span className={styles.dot} aria-hidden />}
      {children}
    </span>
  )
}

export interface CountBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * - `neutral` — section/popup counter (`.count`)
   * - `subtle` — nav counter (`.nav-count`)
   * - `alert` — nav warning counter (`.nav-alert`)
   */
  variant?: "neutral" | "subtle" | "alert"
  children: ReactNode
}

/** Numeric counter chip. */
export function CountBadge({ variant = "neutral", className, children, ...props }: CountBadgeProps) {
  return (
    <span className={cn(styles.count, styles[`count-${variant}`], className)} {...props}>
      {children}
    </span>
  )
}

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  /** `phase` = "Faz 2" pill · `new` = "YENİ" nav tag */
  variant?: "phase" | "new"
  children: ReactNode
}

/** Small uppercase label pill. */
export function Pill({ variant = "phase", className, children, ...props }: PillProps) {
  return (
    <span className={cn(styles.pill, styles[`pill-${variant}`], className)} {...props}>
      {children}
    </span>
  )
}
