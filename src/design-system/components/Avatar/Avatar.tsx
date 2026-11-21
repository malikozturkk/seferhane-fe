import type { HTMLAttributes } from "react"
import { cn } from "../../utils/cn"
import styles from "./Avatar.module.css"

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase("tr")

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Full name — initials are derived from the first two words. */
  name: string
  /** xs 17 · sm 25 · md 33 · lg 65 (px) */
  size?: "xs" | "sm" | "md" | "lg"
}

/** Person avatar with initials (`.avatar`). */
export function Avatar({ name, size = "md", className, ...props }: AvatarProps) {
  return (
    <span
      className={cn(styles.avatar, styles[size], className)}
      role="img"
      aria-label={name}
      title={name}
      {...props}
    >
      {initialsOf(name)}
    </span>
  )
}

export interface CompanyAvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Company name — first letter is shown (or pass `initials`). */
  name: string
  initials?: string
  /** Palette index 0–4 (`.co-0` … `.co-4`). Defaults to a hash of the name. */
  colorIndex?: 0 | 1 | 2 | 3 | 4
}

/** Square company monogram used in tables (`.company-avatar`). */
export function CompanyAvatar({
  name,
  initials,
  colorIndex,
  className,
  ...props
}: CompanyAvatarProps) {
  const index =
    colorIndex ??
    ((Array.from(name).reduce((s, c) => s + c.charCodeAt(0), 0) % 5) as 0 | 1 | 2 | 3 | 4)
  return (
    <span
      className={cn(styles.company, styles[`co${index}`], className)}
      role="img"
      aria-label={name}
      {...props}
    >
      {initials ?? name.charAt(0).toLocaleUpperCase("tr")}
    </span>
  )
}
