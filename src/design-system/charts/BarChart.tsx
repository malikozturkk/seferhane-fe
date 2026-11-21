import { chartColors } from "../tokens"
import { StackedBarChart, type StackedBarChartProps } from "./StackedBarChart"

export interface BarDatum {
  label: string
  value: number
  tooltipLabel?: string
}

export interface BarChartProps
  extends Omit<StackedBarChartProps, "data" | "series" | "showLegend"> {
  data: BarDatum[]
  /** Bar color. Default: primary chart green. */
  color?: string
  /** Series name used in the accessible data table. */
  seriesLabel?: string
}

/**
 * Single-series vertical bar chart — the stacked bar chart's visual language
 * with one series (rounded 4px bars on a soft track, 8px axis labels).
 */
export function BarChart({ data, color = chartColors.primary, seriesLabel = "Değer", ...props }: BarChartProps) {
  return (
    <StackedBarChart
      {...props}
      showLegend={false}
      series={[{ key: "value", label: seriesLabel, color }]}
      data={data.map((d) => ({ label: d.label, tooltipLabel: d.tooltipLabel, values: { value: d.value } }))}
    />
  )
}
