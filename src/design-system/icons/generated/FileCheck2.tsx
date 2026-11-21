import type { IconProps } from "../types"
const FileCheck2Icon = ({
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
    <path d="M10.5 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v6" />
    <path d="M14 2v5a1 1 0 0 0 1 1h5M14 20l2 2 4-4" />
  </svg>
)
export default FileCheck2Icon
