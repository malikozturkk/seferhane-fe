"use client"

import { useRef, type KeyboardEvent, type ReactNode } from "react"
import { cn } from "../../utils/cn"
import { useControllableState, useDismiss, useStableId } from "../../utils/hooks"
import styles from "./DropdownMenu.module.css"

export interface DropdownMenuItem {
  key: string
  label: ReactNode
  icon?: ReactNode
  onSelect?: () => void
  disabled?: boolean
  /** Shows a check mark (single-choice menus such as the workspace switcher). */
  selected?: boolean
}

export interface DropdownMenuProps {
  /** Render the trigger; spread `props` on a button. */
  trigger: (props: {
    onClick: () => void
    onKeyDown: (e: KeyboardEvent) => void
    "aria-haspopup": "menu"
    "aria-expanded": boolean
    "aria-controls": string
  }) => ReactNode
  items: DropdownMenuItem[]
  /** Header block (`.profile-popover > strong / span`). */
  title?: ReactNode
  subtitle?: ReactNode
  /** Helper text below the items (`.company-dropdown > span`). */
  footer?: ReactNode
  align?: "start" | "end"
  /** Width in px. Default 250 */
  width?: number | string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

/** Action menu — profile menu / workspace switcher in the reference. */
export function DropdownMenu({
  trigger,
  items,
  title,
  subtitle,
  footer,
  align = "end",
  width = 250,
  open: openProp,
  onOpenChange,
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useControllableState(openProp, false, onOpenChange)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuId = useStableId()
  useDismiss(open, () => setOpen(false), [wrapRef])

  const focusItem = (dir: 1 | -1 | "first" | "last") => {
    const nodes = Array.from(
      document
        .getElementById(menuId)
        ?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)') ?? [],
    )
    if (!nodes.length) return
    const index = nodes.indexOf(document.activeElement as HTMLButtonElement)
    const next =
      dir === "first" ? 0 : dir === "last" ? nodes.length - 1 : (index + dir + nodes.length) % nodes.length
    nodes[next].focus()
  }
  const openAndFocus = () => {
    setOpen(true)
    requestAnimationFrame(() => focusItem("first"))
  }
  const close = (refocus = true) => {
    setOpen(false)
    if (refocus)
      document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(menuId)}"]`)?.focus()
  }
  const onMenuKey = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        focusItem(1)
        break
      case "ArrowUp":
        focusItem(-1)
        break
      case "Home":
        focusItem("first")
        break
      case "End":
        focusItem("last")
        break
      case "Escape":
        close()
        break
      case "Tab":
        setOpen(false)
        return
      default:
        return
    }
    e.preventDefault()
  }
  const hasSelection = items.some((i) => i.selected !== undefined)

  return (
    <div ref={wrapRef} className={cn(styles.wrap, className)}>
      {trigger({
        onClick: () => (open ? setOpen(false) : setOpen(true)),
        onKeyDown: (e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            openAndFocus()
          }
        },
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": menuId,
      })}
      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(styles.menu, styles[align])}
          style={{ width }}
          onKeyDown={onMenuKey}
        >
          {title && <strong className={styles.title}>{title}</strong>}
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role={hasSelection ? "menuitemradio" : "menuitem"}
              aria-checked={hasSelection ? Boolean(item.selected) : undefined}
              disabled={item.disabled}
              className={styles.item}
              onClick={() => {
                item.onSelect?.()
                close()
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          {footer && <span className={styles.footer}>{footer}</span>}
        </div>
      )}
    </div>
  )
}
