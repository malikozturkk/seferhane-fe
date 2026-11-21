"use client"

import type { ReactNode } from "react"
import { chartColors } from "../tokens"
import { cn } from "../utils/cn"
import styles from "./Charts.module.css"

export interface DonutDatum {
  label: string
  value: number
  color: string
}

export interface DonutChartProps {
  data: DonutDatum[]
  /** Big number in the middle. Default: sum of values. */
  centerValue?: ReactNode
  /** Caption under the center value (e.g. "bugünkü sefer"). */
  centerLabel?: ReactNode
  /** Rendered diameter in px. Default 156 (reference). */
  size?: number
  /** Ring thickness in viewBox units (viewBox = 180). Default 17 */
  thickness?: number
  /** Gap between segments in viewBox units. Default 3 */
  gap?: number
  showLegend?: boolean
  /** Legend columns. Default 2 */
  legendColumns?: 1 | 2
  /** Makes legend rows clickable (e.g. filter by status). */
  onSelect?: (datum: DonutDatum) => void
  /** Side-by-side layout (tablet design). */
  layout?: "stacked" | "inline"
  "aria-label": string
  className?: string
}

/** Donut with center KPI and legend. Reference: Dashboard → "Bugünkü operasyon". */
export function DonutChart({
  data,
  centerValue,
  centerLabel,
  size = 156,
  thickness = 17,
  gap = 3,
  showLegend = true,
  legendColumns = 2,
  onSelect,
  layout = "stacked",
  className,
  ...props
}: DonutChartProps) {
  const r = 90 - thickness / 2 - 1.5
  const circumference = 2 * Math.PI * r
  const visible = data.filter((d) => d.value > 0)
  const total = visible.reduce((s, d) => s + d.value, 0)
  const segments = visible.reduce<Array<DonutDatum & { length: number; offset: number }>>((acc, d) => {
    const prev = acc[acc.length - 1]
    const offset = prev ? prev.offset + prev.length : 0
    return [...acc, { ...d, length: (d.value / (total || 1)) * circumference, offset }]
  }, [])
  return (
    <div className={cn(styles.donutArea, layout === "inline" && styles.donutInline, className)}>
      <svg
        viewBox="0 0 180 180"
        className={styles.donut}
        style={{ width: size, height: size }}
        role="img"
        aria-label={props["aria-label"]}
      >
        <circle cx="90" cy="90" r={r} fill="none" stroke={chartColors.track} strokeWidth={thickness} />
        {segments.map((p) => (
          <circle
            key={p.label}
            cx="90"
            cy="90"
            r={r}
            fill="none"
            stroke={p.color}
            strokeWidth={thickness}
            strokeDasharray={`${Math.max(0, p.length - (segments.length > 1 ? gap : 0))} ${circumference}`}
            strokeDashoffset={-p.offset}
            transform="rotate(-90 90 90)"
          >
            <title>{`${p.label}: ${p.value}`}</title>
          </circle>
        ))}
        <text x="90" y="90" textAnchor="middle" className={styles.donutValue}>
          {centerValue ?? total}
        </text>
        {centerLabel && (
          <text x="90" y="111" textAnchor="middle" className={styles.donutLabel}>
            {centerLabel}
          </text>
        )}
      </svg>
      {showLegend && (
        <ul className={cn(styles.donutLegend, legendColumns === 1 && styles.oneCol)}>
          {visible.map((d) => {
            const content = (
              <>
                <span>
                  <i style={{ background: d.color }} />
                  {d.label}
                </span>
                <b>{d.value}</b>
              </>
            )
            return (
              <li key={d.label}>
                {onSelect ? (
                  <button type="button" onClick={() => onSelect(d)}>
                    {content}
                  </button>
                ) : (
                  <div>{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
