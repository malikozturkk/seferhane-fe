"use client"

import { useId, useState, type KeyboardEvent } from "react"
import { chartColors } from "../../tokens"
import { cn } from "../../utils/cn"
import styles from "../Charts.module.css"

export interface TrendSeries<K extends string = string> {
  /** Key in each datum holding the numeric value. */
  key: K
  label: string
  color?: string
  /** `area` = filled gradient + line · `line` = solid · `dashed` = comparison line */
  variant?: "area" | "line" | "dashed"
  strokeWidth?: number
}

export interface TrendChartProps<K extends string = string> {
  /** Ordered points. `label` is the x-axis text; `tooltipLabel` overrides the tooltip header. */
  data: Array<{ label: string; tooltipLabel?: string } & Record<K, number>>
  series: TrendSeries<K>[]
  /** viewBox width — the SVG scales to 100% of its container. Default 650 */
  width?: number
  /** viewBox height. Default 235 */
  height?: number
  /** Number of horizontal grid lines. Default 4 */
  gridLines?: number
  /** Y-axis tick formatter. Default: `₺{v/1000}b` like the reference. */
  formatYAxis?: (value: number) => string
  /** Tooltip value formatter (first series). */
  formatValue?: (value: number) => string
  /** Series whose value drives the hover marker & tooltip. Default: first series. */
  focusSeries?: K
  /** Initially highlighted index. Default: last point. */
  defaultActiveIndex?: number
  showTooltip?: boolean
  "aria-label": string
  className?: string
}

const defaultY = (v: number) => `₺${Math.round(v / 1000)}b`
const defaultValue = (v: number) => `₺${v.toLocaleString("tr-TR")}`

/** Shared engine for AreaChart & LineChart (reference: `RevenueChart`). */
export function TrendChart<K extends string>({
  data,
  series,
  width = 650,
  height = 235,
  gridLines = 4,
  formatYAxis = defaultY,
  formatValue = defaultValue,
  focusSeries,
  defaultActiveIndex,
  showTooltip = true,
  className,
  ...props
}: TrendChartProps<K>) {
  const gradientBase = `trend${useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const [active, setActive] = useState(defaultActiveIndex ?? data.length - 1)
  if (!data.length) return null

  // Geometry scaled from the reference 650×235 layout.
  const left = (60 / 650) * width
  const right = width - (44 / 650) * width
  const top = (45 / 235) * height
  const bottom = height - (40 / 235) * height
  const step = data.length > 1 ? (right - left) / (data.length - 1) : 0
  const max =
    Math.max(...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))) * 1.1 || 1
  const x = (i: number) => (data.length > 1 ? left + i * step : (left + right) / 2)
  const y = (v: number) => bottom - (v / max) * (bottom - top)
  const path = (key: K) => data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(Number(d[key]) || 0)}`).join(" ")
  const levels = Array.from({ length: gridLines }, (_, i) => 1 - i / (gridLines - 1 || 1))
  const focus = focusSeries ?? series[0].key
  const h = Math.min(Math.max(active, 0), data.length - 1)
  const focusValue = Number(data[h][focus]) || 0

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") setActive(Math.min(data.length - 1, h + 1))
    else if (e.key === "ArrowLeft") setActive(Math.max(0, h - 1))
    else return
    e.preventDefault()
  }

  return (
    <div className={cn(styles.trend, className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={props["aria-label"]}
        tabIndex={0}
        onKeyDown={onKey}
      >
        <defs>
          {series
            .filter((s) => s.variant === "area")
            .map((s) => (
              <linearGradient key={s.key} id={`${gradientBase}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color ?? chartColors.area} stopOpacity=".15" />
                <stop offset="100%" stopColor={s.color ?? chartColors.area} stopOpacity="0" />
              </linearGradient>
            ))}
        </defs>
        {levels.map((f) => {
          const gy = bottom - f * (bottom - top)
          return (
            <g key={f}>
              <text x="0" y={gy + 4} className={styles.axis}>
                {formatYAxis(max * f)}
              </text>
              <line
                x1={left - 4}
                y1={gy}
                x2={width - 20}
                y2={gy}
                stroke={chartColors.grid}
                strokeDasharray="4 4"
              />
            </g>
          )
        })}
        {series.map((s) =>
          s.variant === "area" ? (
            <path
              key={`${s.key}-fill`}
              d={`${path(s.key)} L${x(data.length - 1)},${bottom} L${x(0)},${bottom} Z`}
              fill={`url(#${gradientBase}-${s.key})`}
            />
          ) : null,
        )}
        {series.map((s) => (
          <path
            key={s.key}
            d={path(s.key)}
            fill="none"
            stroke={s.color ?? (s.variant === "dashed" ? chartColors.comparison : chartColors.primary)}
            strokeWidth={s.strokeWidth ?? (s.variant === "dashed" ? 2 : 2.5)}
            strokeDasharray={s.variant === "dashed" ? "5 5" : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        <line
          x1={x(h)}
          x2={x(h)}
          y1={top - 17}
          y2={bottom}
          stroke={chartColors.crosshair}
          strokeDasharray="4 4"
        />
        <circle
          cx={x(h)}
          cy={y(focusValue)}
          r="5"
          fill={chartColors.point}
          stroke="white"
          strokeWidth="3"
        />
        {data.map((d, i) => (
          <g key={`${d.label}-${i}`} onMouseEnter={() => setActive(i)}>
            <rect
              x={x(i) - (step || width) / 2}
              y={top - 25}
              width={step || width}
              height={bottom - top + 50}
              fill="transparent"
            />
            <text
              x={x(i)}
              y={height - 11}
              textAnchor="middle"
              className={cn(styles.axis, h === i && styles.axisActive)}
            >
              {d.label}
            </text>
          </g>
        ))}
      </svg>
      {showTooltip && (
        <div
          className={styles.tooltip}
          aria-live="polite"
          style={{
            left: `${Math.min(88, Math.max(12, (x(h) / width) * 100))}%`,
            top: `${(y(focusValue) / height) * 100}%`,
          }}
        >
          <span>{data[h].tooltipLabel ?? data[h].label}</span>
          <strong>{formatValue(focusValue)}</strong>
        </div>
      )}
    </div>
  )
}
