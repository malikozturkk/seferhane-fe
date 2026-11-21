"use client"

import { useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { XIcon } from "../../icons"
import { cn } from "../../utils/cn"
import { useFocusTrap, useIsClient, useStableId } from "../../utils/hooks"
import { IconButton } from "../IconButton/IconButton"
import styles from "./Drawer.module.css"

export interface DrawerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Optional header. Omit for fully custom content (e.g. the mobile sidebar). */
  title?: ReactNode
  subtitle?: ReactNode
  side?: "left" | "right"
  /** Panel width in px. Default 244 (mobile navigation width). */
  width?: number
  /** Accessible name when `title` is not given. */
  "aria-label"?: string
  className?: string
}

/**
 * Slide-in panel. Based on the reference's mobile navigation drawer
 * (`.sidebar.is-open` + `.sidebar-overlay`); the header reuses the modal header.
 */
export function Drawer({
  open,
  onClose,
  children,
  title,
  subtitle,
  side = "left",
  width = 244,
  className,
  ...props
}: DrawerProps) {
  const ref = useRef<HTMLElement>(null)
  const titleId = useStableId()
  const isClient = useIsClient()
  useFocusTrap(ref, open, onClose)
  if (!open || !isClient) return null
  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : props["aria-label"]}
        tabIndex={-1}
        className={cn(styles.drawer, styles[side], className)}
        style={{ width }}
      >
        {title && (
          <header className={styles.header}>
            <div>
              <h2 id={titleId}>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <IconButton aria-label="Kapat" icon={<XIcon size={20} />} onClick={onClose} />
          </header>
        )}
        <div className={styles.content}>{children}</div>
      </aside>
    </>,
    document.body,
  )
}
