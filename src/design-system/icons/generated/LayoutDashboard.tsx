import type { IconProps } from "../types"
const LayoutDashboardIcon = ({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  absoluteStrokeWidth = false,
  title,
  titleId,
  ...props
}: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={
      absoluteStrokeWidth
        ? (Number(strokeWidth) * 24) / Number(size)
        : strokeWidth
    }
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden={title ? undefined : true}
    role={title ? "img" : undefined}
    focusable="false"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <rect width={7} height={9} x={3} y={3} rx={1} />
    <rect width={7} height={5} x={14} y={3} rx={1} />
    <rect width={7} height={9} x={14} y={12} rx={1} />
    <rect width={7} height={5} x={3} y={16} rx={1} />
  </svg>
)
export default LayoutDashboardIcon
