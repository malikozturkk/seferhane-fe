/**
 * Token references for TypeScript (charts, inline styles, media queries).
 * Values point at the CSS variables declared in `tokens.css`, so the CSS
 * file stays the single source of truth.
 */

const v = (name: string) => `var(--${name})`

export const colors = {
  brand: v("color-brand"),
  primary: v("color-primary"),
  surface: v("color-surface"),
  canvas: v("color-canvas"),
  border: v("color-border"),
  ink: v("color-ink"),
  inkMuted: v("color-ink-muted"),
  success: v("color-success"),
  info: v("color-info"),
  warning: v("color-warning"),
  danger: v("color-danger"),
} as const

export const chartColors = {
  primary: v("color-chart-primary"),
  area: v("color-chart-area"),
  point: v("color-chart-point"),
  comparison: v("color-chart-comparison"),
  grid: v("color-chart-grid"),
  crosshair: v("color-chart-crosshair"),
  axis: v("color-chart-axis"),
  axisActive: v("color-chart-axis-active"),
  track: v("color-chart-track"),
  barTrack: v("color-chart-bar-track"),
} as const

/** Categorical palette (used by stacked bars / category breakdowns). */
export const categoricalPalette = [
  v("color-chart-1"),
  v("color-chart-2"),
  v("color-chart-3"),
  v("color-chart-4"),
  v("color-chart-5"),
  v("color-chart-6"),
  v("color-chart-7"),
  v("color-chart-8"),
  v("color-chart-9"),
] as const

/** Trip status palette (donut "Bugünkü operasyon"). */
export const statusPalette = {
  transit: v("color-status-transit"),
  loading: v("color-status-loading"),
  planned: v("color-status-planned"),
  delivered: v("color-status-delivered"),
  docs: v("color-status-docs"),
} as const

/** Max-width breakpoints used by the reference design (px). */
export const breakpoints = {
  mobile: 700,
  tablet: 950,
  laptop: 1150,
  wide: 1500,
} as const

export const zIndex = {
  dropdown: 20,
  topbar: 25,
  sidebar: 40,
  popover: 70,
  drawerOverlay: 80,
  drawer: 90,
  modal: 100,
  toast: 150,
  tooltip: 160,
} as const

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const
