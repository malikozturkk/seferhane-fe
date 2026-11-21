"use client"

import { useRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { cn } from "../../utils/cn"
import { useControllableState, useDismiss, useStableId } from "../../utils/hooks"
import { CountBadge } from "../Badge/Badge"
import { StatusIndicator } from "../StatusIndicator/StatusIndicator"
import styles from "./Popover.module.css"

export interface PopoverProps {
  trigger: (props: {
    onClick: () => void
    "aria-expanded": boolean
    "aria-controls": string
    "aria-haspopup": "dialog"
  }) => ReactNode
  children: ReactNode
  title?: ReactNode
  /** Counter next to the title. */
  count?: number | string
  /** Header right-side action (e.g. "Tümünü okundu işaretle"). */
  headerAction?: ReactNode
  align?: "start" | "end"
  /** Width in px. Default 350 */
  width?: number | string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

/** Floating panel anchored to a trigger (`.notification-popover`). */
export function Popover({
  trigger,
  children,
  title,
  count,
  headerAction,
  align = "end",
  width = 350,
  open: openProp,
  onOpenChange,
  className,
}: PopoverProps) {
  const [open, setOpen] = useControllableState(openProp, false, onOpenChange)
  const wrapRef = useRef<HTMLDivElement>(null)
  const id = useStableId()
  const titleId = `${id}-title`
  useDismiss(open, () => setOpen(false), [wrapRef])
  return (
    <div ref={wrapRef} className={styles.wrap}>
      {trigger({
        onClick: () => setOpen(!open),
        "aria-expanded": open,
        "aria-controls": id,
        "aria-haspopup": "dialog",
      })}
      {open && (
        <div
          id={id}
          role="dialog"
          aria-labelledby={title ? titleId : undefined}
          className={cn(styles.popover, styles[align], className)}
          style={{ width }}
        >
          {(title || headerAction) && (
            <header className={styles.header}>
              <h3 id={titleId}>
                {title}
                {count !== undefined && <CountBadge>{count}</CountBadge>}
              </h3>
              {headerAction}
            </header>
          )}
          <div className={styles.body}>{children}</div>
        </div>
      )}
    </div>
  )
}

export interface NotificationItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
  time?: ReactNode
  unread?: boolean
}

/** Row inside a notification popover (`.notification-item`). */
export function NotificationItem({
  icon,
  title,
  description,
  time,
  unread = false,
  className,
  ...props
}: NotificationItemProps) {
  return (
    <button type="button" className={cn(styles.item, className)} {...props}>
      {icon}
      <div>
        <strong>{title}</strong>
        {description && <span>{description}</span>}
        {time && <small>{time}</small>}
      </div>
      {unread && <StatusIndicator status="live" aria-label="Okunmadı" />}
    </button>
  )
}
