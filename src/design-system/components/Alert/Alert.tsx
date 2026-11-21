import type { HTMLAttributes, ReactNode } from "react"
import { CircleAlertIcon, CircleCheckIcon, ShieldCheckIcon } from "../../icons"
import { cn } from "../../utils/cn"
import styles from "./Alert.module.css"

export type AlertTone = "success" | "info" | "warning" | "error"

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /**
   * - `success` / `info` — soft sage notice (reference `.notice`)
   * - `error` — `.notice.error`
   * - `warning` — derived from warning tokens (not in the reference)
   */
  tone?: AlertTone
  title?: ReactNode
  children?: ReactNode
  /** Override the default icon, or pass `null` to hide it. */
  icon?: ReactNode | null
  /** Right-aligned action (e.g. a link button). */
  action?: ReactNode
}

const defaultIcons: Record<AlertTone, ReactNode> = {
  success: <CircleCheckIcon size={20} />,
  info: <ShieldCheckIcon size={20} />,
  warning: <CircleAlertIcon size={20} />,
  error: <CircleAlertIcon size={20} />,
}

/** Inline contextual message (`.notice`). */
export function Alert({ tone = "success", title, children, icon, action, className, ...props }: AlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(styles.alert, styles[tone], className)}
      {...props}
    >
      {icon === null ? null : (icon ?? defaultIcons[tone])}
      <div className={styles.content}>
        {title && <strong>{title}</strong>}
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  )
}
