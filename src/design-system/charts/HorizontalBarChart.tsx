import { cn } from "../utils/cn"
import styles from "./Charts.module.css"

export interface HorizontalBarDatum {
  label: string
  value: number
  color?: string
}

export interface HorizontalBarChartProps {
  data: HorizontalBarDatum[]
  /** Scale max. Default: 100 when `valueType="percent"`, otherwise the largest value. */
  max?: number
  valueType?: "percent" | "number"
  formatValue?: (value: number) => string
  /** Label column width in px. Default 130 */
  labelWidth?: number
  "aria-label": string
  className?: string
}

/** Horizontal bars with label + value. Reference: Hasar & şikâyet → "Hasar analizi". */
export function HorizontalBarChart({
  data,
  max,
  valueType = "percent",
  formatValue,
  labelWidth = 130,
  className,
  ...props
}: HorizontalBarChartProps) {
  const scale = max ?? (valueType === "percent" ? 100 : Math.max(...data.map((d) => d.value), 0) || 1)
  const fmt = formatValue ?? ((v: number) => (valueType === "percent" ? `%${v}` : v.toLocaleString("tr-TR")))
  return (
    <ul className={cn(styles.hbars, className)} aria-label={props["aria-label"]}>
      {data.map((d) => (
        <li key={d.label}>
          <span style={{ width: labelWidth }}>{d.label}</span>
          <div
            role="meter"
            aria-label={d.label}
            aria-valuemin={0}
            aria-valuemax={scale}
            aria-valuenow={d.value}
            aria-valuetext={fmt(d.value)}
          >
            <i style={{ width: `${Math.min(100, (d.value / scale) * 100)}%`, background: d.color }} />
          </div>
          <b>{fmt(d.value)}</b>
        </li>
      ))}
    </ul>
  )
}
