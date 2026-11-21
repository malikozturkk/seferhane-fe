import type { ReactNode } from "react"
import { categoricalPalette } from "../tokens"
import { cn } from "../utils/cn"
import { ProgressBar } from "../components/ProgressBar/ProgressBar"
import styles from "./Charts.module.css"

export interface BreakdownDatum {
  label: string
  value: number
  color?: string
  /** Right-hand text. Default: share of total ("%64"). */
  valueLabel?: ReactNode
}

export interface BreakdownChartProps {
  data: BreakdownDatum[]
  /**
   * Bar length relative to the `total` (shares add up to 100%) or the
   * largest item (`max`, reference "Kalem bazında dağılım").
   */
  relativeTo?: "total" | "max"
  "aria-label": string
  className?: string
}

/**
 * Ranked category distribution — legend swatch, label, value and a thin bar.
 * Reference: Maliyet → "Gider dağılımı", Araç maliyetleri → "Kalem bazında dağılım".
 */
export function BreakdownChart({ data, relativeTo = "total", className, ...props }: BreakdownChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const max = Math.max(...data.map((d) => d.value), 0) || 1
  return (
    <ul className={cn(styles.breakdown, className)} aria-label={props["aria-label"]}>
      {data.map((d, i) => {
        const color = d.color ?? categoricalPalette[i % categoricalPalette.length]
        return (
          <li key={d.label}>
            <ProgressBar
              value={d.value}
              max={relativeTo === "total" ? total : max}
              color={color}
              aria-label={d.label}
              label={
                <>
                  <i className={styles.swatch} style={{ background: color }} />
                  {d.label}
                </>
              }
              valueLabel={d.valueLabel ?? `%${Math.round((d.value / total) * 100)}`}
            />
          </li>
        )
      })}
    </ul>
  )
}
