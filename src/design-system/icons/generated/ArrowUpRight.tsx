import type { IconProps } from "../types"
const ArrowUpRightIcon = ({
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
    <path d="M7 7h10v10M7 17 17 7" />
  </svg>
)
export default ArrowUpRightIcon
