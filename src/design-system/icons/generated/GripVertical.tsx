import type { IconProps } from "../types"
const GripVerticalIcon = ({
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
    <circle cx={9} cy={12} r={1} />
    <circle cx={9} cy={5} r={1} />
    <circle cx={9} cy={19} r={1} />
    <circle cx={15} cy={12} r={1} />
    <circle cx={15} cy={5} r={1} />
    <circle cx={15} cy={19} r={1} />
  </svg>
)
export default GripVerticalIcon
