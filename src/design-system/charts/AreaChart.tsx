"use client"

import { TrendChart, type TrendChartProps, type TrendSeries } from "./internal/TrendChart"

export interface AreaChartProps<K extends string = string>
  extends Omit<TrendChartProps<K>, "series"> {
  /**
   * First series is drawn as the filled area. Further series default to
   * dashed comparison lines (reference: gelir alanı + gider kesikli çizgi).
   */
  series: TrendSeries<K>[]
}

/**
 * Area chart with hover crosshair, marker and tooltip.
 * Reference: Dashboard → "Gelir & gider görünümü".
 *
 * @example
 * <AreaChart
 *   aria-label="Gelir ve gider"
 *   data={[{ label: "Pzt", revenue: 42000, cost: 31000 }, …]}
 *   series={[{ key: "revenue", label: "Gelir" }, { key: "cost", label: "Gider" }]}
 * />
 */
export function AreaChart<K extends string>({ series, ...props }: AreaChartProps<K>) {
  const normalized = series.map((s, i) => ({
    ...s,
    variant: s.variant ?? (i === 0 ? "area" : "dashed"),
  })) as TrendSeries<K>[]
  return <TrendChart series={normalized} {...props} />
}
