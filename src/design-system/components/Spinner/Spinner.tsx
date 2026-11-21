import { cn } from "../../utils/cn"
import styles from "./Spinner.module.css"

export interface SpinnerProps {
  /** Diameter in px. Default 16 */
  size?: number
  /** `current` inherits text color (useful inside buttons). */
  tone?: "brand" | "current" | "muted"
  /** Accessible label. Pass `null` when the spinner is decorative. */
  label?: string | null
  className?: string
}

export function Spinner({
  size = 16,
  tone = "brand",
  label = "Yükleniyor",
  className,
}: SpinnerProps) {
  return (
    <span
      className={cn(styles.spinner, styles[tone], className)}
      style={{ width: size, height: size, borderWidth: Math.max(2, size / 8) }}
      role={label ? "status" : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
    />
  )
}
