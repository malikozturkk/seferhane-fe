import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { cn } from "../../utils/cn"
import styles from "./IconButton.module.css"

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Required accessible name (icon-only buttons have no visible text). */
  "aria-label": string
  icon: ReactNode
  /** `ghost` = topbar / modal close; `outline` = bordered square. */
  variant?: "ghost" | "outline"
  size?: "sm" | "md" | "lg"
  /** Shows the small amber unread dot (notification bell). */
  indicator?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon,
      variant = "ghost",
      size = "md",
      indicator = false,
      className,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(styles.iconButton, styles[variant], styles[size], className)}
        {...props}
      >
        {icon}
        {indicator && <i className={styles.indicator} aria-hidden />}
      </button>
    )
  },
)
