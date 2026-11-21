import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "../../utils/cn"
import styles from "./IconTile.module.css"

export type IconTileTone =
  | "orange"
  | "purple"
  | "blue"
  | "green"
  | "neutral"
  | "sage"
  | "warm"

export interface IconTileProps extends HTMLAttributes<HTMLSpanElement> {
  icon: ReactNode
  /**
   * - orange / purple / blue / green — attention & notification icons
   * - neutral — KPI metric icon
   * - sage — resource / record / rule icons (bordered)
   * - warm — warning KPI icon
   */
  tone?: IconTileTone
  /** sm 28 · md 34 · lg 58 (px). `file` shape is 36×40. */
  size?: "sm" | "md" | "lg"
  shape?: "rounded" | "circle" | "file"
}

/** Square/round tinted container for an icon. */
export function IconTile({
  icon,
  tone = "neutral",
  size = "md",
  shape = "rounded",
  className,
  ...props
}: IconTileProps) {
  return (
    <span
      className={cn(styles.tile, styles[tone], styles[size], styles[shape], className)}
      aria-hidden
      {...props}
    >
      {icon}
    </span>
  )
}
