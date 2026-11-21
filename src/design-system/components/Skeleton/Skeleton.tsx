import type { CSSProperties } from "react"
import { cn } from "../../utils/cn"
import styles from "./Skeleton.module.css"

export interface SkeletonProps {
  width?: CSSProperties["width"]
  /** Default 22px (reference line height). */
  height?: CSSProperties["height"]
  shape?: "line" | "circle" | "block"
  className?: string
}

/** Shimmering placeholder block (`.skeleton-group div`). */
export function Skeleton({ width = "100%", height = 22, shape = "line", className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(styles.skeleton, styles[shape], className)}
      style={{ width, height: shape === "circle" ? width : height }}
    />
  )
}

export interface SkeletonGroupProps {
  /** Number of lines. Widths follow the reference: 100% → 80% → 55%. */
  lines?: number
  label?: string
  className?: string
}

const widths = ["100%", "80%", "55%"]

/** Page/section loading placeholder (`.skeleton-group`). */
export function SkeletonGroup({ lines = 3, label = "Yükleniyor", className }: SkeletonGroupProps) {
  return (
    <div className={cn(styles.group, className)} role="status" aria-label={label} aria-busy>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={widths[i % widths.length]} />
      ))}
    </div>
  )
}
