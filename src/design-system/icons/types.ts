import type { ComponentType, SVGProps } from "react"

export interface IconProps
  extends Omit<SVGProps<SVGSVGElement>, "color" | "stroke" | "strokeWidth"> {
  /** Width & height in px (or any CSS length). Default: 24 */
  size?: number | string
  /** Stroke / fill color. Default: `currentColor` */
  color?: string
  /** Stroke width in viewBox units. Default: 2 */
  strokeWidth?: number | string
  /** Keep the visual stroke width constant regardless of `size`. */
  absoluteStrokeWidth?: boolean
  /** Accessible label. When omitted the icon is `aria-hidden`. */
  title?: string
  titleId?: string
}

export type IconComponent = ComponentType<IconProps>
