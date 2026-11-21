"use client"

import { useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { XIcon } from "../../icons"
import { cn } from "../../utils/cn"
import { useFocusTrap, useIsClient, useStableId } from "../../utils/hooks"
import { IconButton } from "../IconButton/IconButton"
import styles from "./Modal.module.css"

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  /** md = 530px · lg = 720px (`.modal-wide`) */
  size?: "md" | "lg"
  /** Close when the backdrop is clicked. Default true */
  closeOnOverlayClick?: boolean
  closeLabel?: string
  className?: string
}

/** Dialog (`.modal`). Focus is trapped, Escape closes, body scroll is locked. */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = "md",
  closeOnOverlayClick = true,
  closeLabel = "Kapat",
  className,
}: ModalProps) {
  const ref = useRef<HTMLElement>(null)
  const titleId = useStableId()
  const descId = useStableId()
  const isClient = useIsClient()
  useFocusTrap(ref, open, onClose)
  if (!open || !isClient) return null
  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) onClose()
      }}
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descId : undefined}
        tabIndex={-1}
        className={cn(styles.modal, styles[size], className)}
      >
        <header className={styles.header}>
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p id={descId}>{subtitle}</p>}
          </div>
          <IconButton aria-label={closeLabel} icon={<XIcon size={20} />} onClick={onClose} />
        </header>
        {children}
      </section>
    </div>,
    document.body,
  )
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(styles.body, className)}>{children}</div>
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(styles.footer, className)}>{children}</div>
}
