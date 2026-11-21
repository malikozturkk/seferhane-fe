import type { ReactNode } from "react"
import { ArrowUpRightIcon } from "../icons"
import { cn } from "../utils/cn"
import styles from "./Charts.module.css"

export interface ChartLegendProps {
  items: Array<{ label: ReactNode; color: string }>
  /** `square` (bars / donut) or `dot` (line charts). */
  marker?: "square" | "dot"
  className?: string
}

/** Inline legend row. */
export function ChartLegend({ items, marker = "square", className }: ChartLegendProps) {
  return (
    <ul className={cn(styles.legend, className)}>
      {items.map((item, i) => (
        <li key={i}>
          <i className={styles[marker]} style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export interface ChartSummaryItem {
  label: ReactNode
  value: ReactNode
  color?: string
  /** Positive change chip (e.g. "%6,8"). */
  change?: ReactNode
}

export interface ChartSummaryProps {
  items: ChartSummaryItem[]
  /** Right-aligned net figure (e.g. "Brüt kâr %24,3"). */
  net?: { label: ReactNode; value: ReactNode }
  className?: string
}

/** KPI row above a trend chart (`.chart-summary`). */
export function ChartSummary({ items, net, className }: ChartSummaryProps) {
  return (
    <div className={cn(styles.summary, className)}>
      {items.map((item, i) => (
        <div key={i}>
          <span className={styles.summaryLabel}>
            {item.color && <i style={{ background: item.color }} />}
            {item.label}
          </span>
          <strong>
            {item.value}
            {item.change && (
              <span className={styles.change}>
                <ArrowUpRightIcon size={12} />
                {item.change}
              </span>
            )}
          </strong>
        </div>
      ))}
      {net && (
        <div className={styles.net}>
          <span>{net.label}</span>
          <strong>{net.value}</strong>
        </div>
      )}
    </div>
  )
}
