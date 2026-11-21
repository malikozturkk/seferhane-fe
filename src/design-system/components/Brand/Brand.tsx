import type { ReactNode } from "react"
import { cn } from "../../utils/cn"
import styles from "./Brand.module.css"

/** Two folded route ribbons form an "S": departure, connected operations, arrival. */
export function BrandSymbol({ size = 38, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={cn(styles.symbol, className)}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path d="M12 5H37L29 13H16L10 19H2L12 5Z" fill="currentColor" />
      <path d="M10 19H22L30 27H18L10 19Z" fill="currentColor" opacity=".55" />
      <path d="M28 35H3L11 27H24L30 21H38L28 35Z" fill="currentColor" />
    </svg>
  )
}

export interface BrandProps {
  /** Light text for dark backgrounds. */
  inverse?: boolean
  /** Small pill after the wordmark (e.g. "portal"). */
  label?: ReactNode
  /** sm = 23px (mobile) · md = 25px (sidebar) · lg = 29px (website) */
  size?: "sm" | "md" | "lg"
  className?: string
}

/** Seferhane wordmark (`.seferhane-wordmark`). */
export function Brand({ inverse = false, label, size = "md", className }: BrandProps) {
  const symbol = { sm: 29, md: 33, lg: 37 }[size]
  return (
    <span className={cn(styles.wordmark, styles[size], inverse && styles.inverse, className)} aria-label="Seferhane">
      <BrandSymbol size={symbol} />
      <span aria-hidden>seferhane</span>
      {label && <small>{label}</small>}
    </span>
  )
}
