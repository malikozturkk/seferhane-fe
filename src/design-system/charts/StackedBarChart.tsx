import type { CSSProperties } from "react"
import { categoricalPalette } from "../tokens"
import { cn } from "../utils/cn"
import { ChartLegend } from "./ChartLegend"
import styles from "./Charts.module.css"

export interface BarSeries {
  key: string
  label: string
  /** Defaults to the categorical palette. */
  color?: string
}

export interface StackedBarDatum {
  label: string
  /** Value per series key. Missing keys count as 0. */
  values: Record<string, number>
  /** Optional tooltip header (defaults to `label`). */
  tooltipLabel?: string
}

export interface StackedBarChartProps {
  data: StackedBarDatum[]
  series: BarSeries[]
  /** Plot height in px (bars + labels). Default 220 */
  height?: number
  /** Max bar width in px. Default 34 */
  barMaxWidth?: number
  /** Min width per bar column; the chart scrolls horizontally when needed. Default 26 */
  minColumnWidth?: number
  showLegend?: boolean
  formatValue?: (value: number) => string
  "aria-label": string
  className?: string
}

const defaultFormat = (v: number) => `₺${v.toLocaleString("tr-TR")}`

/** Vertical stacked bars. Reference: Filo → Araç maliyetleri → "Masraf trendi". */
export function StackedBarChart({
  data,
  series,
  height = 220,
  barMaxWidth = 34,
  minColumnWidth = 26,
  showLegend = true,
  formatValue = defaultFormat,
  className,
  ...props
}: StackedBarChartProps) {
  const colored = series.map((s, i) => ({
    ...s,
    color: s.color ?? categoricalPalette[i % categoricalPalette.length],
  }))
  const totals = data.map((d) => colored.reduce((s, c) => s + (d.values[c.key] || 0), 0))
  const max = Math.max(...totals, 0) || 1
  const plot = height - 40
  return (
    <div className={cn(styles.barsWrap, className)}>
      <div
        className={styles.bars}
        role="img"
        aria-label={props["aria-label"]}
        style={{ height, minWidth: data.length * minColumnWidth } as CSSProperties}
      >
        {data.map((d, i) => (
          <div
            key={`${d.label}-${i}`}
            className={styles.barColumn}
            title={`${d.tooltipLabel ?? d.label} · ${formatValue(totals[i])}`}
          >
            <div
              className={styles.bar}
              style={{ maxWidth: barMaxWidth, height: `${(totals[i] / max) * plot}px` }}
            >
              {colored
                .filter((c) => (d.values[c.key] || 0) > 0)
                .map((c) => (
                  <i
                    key={c.key}
                    style={{
                      height: `${((d.values[c.key] || 0) / (totals[i] || 1)) * 100}%`,
                      background: c.color,
                    }}
                  />
                ))}
            </div>
            <small>{d.label}</small>
          </div>
        ))}
      </div>
      {showLegend && colored.length > 1 && (
        <ChartLegend items={colored.map((c) => ({ label: c.label, color: c.color }))} />
      )}
      <table className={styles.srOnly}>
        <caption>{props["aria-label"]}</caption>
        <thead>
          <tr>
            <th scope="col">Dönem</th>
            {colored.map((c) => (
              <th scope="col" key={c.key}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={`${d.label}-${i}`}>
              <th scope="row">{d.tooltipLabel ?? d.label}</th>
              {colored.map((c) => (
                <td key={c.key}>{formatValue(d.values[c.key] || 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
