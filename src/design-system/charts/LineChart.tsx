"use client"

import { TrendChart, type TrendChartProps, type TrendSeries } from "./internal/TrendChart"

export interface LineChartProps<K extends string = string>
  extends Omit<TrendChartProps<K>, "series"> {
  /** Series default to solid lines; use `variant: "dashed"` for targets/comparisons. */
  series: TrendSeries<K>[]
}

/**
 * Line chart (no fill) sharing the area chart's axes, grid, crosshair and
 * tooltip. Reference: the "Toplam gider" dashed series of the revenue chart.
 */
export function LineChart<K extends string>({ series, ...props }: LineChartProps<K>) {
  const normalized = series.map((s) => ({
    ...s,
    variant: s.variant === "area" ? "line" : (s.variant ?? "line"),
  })) as TrendSeries<K>[]
  return <TrendChart series={normalized} {...props} />
}
