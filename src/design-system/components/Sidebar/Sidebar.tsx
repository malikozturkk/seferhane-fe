"use client"

import { useEffect, type ButtonHTMLAttributes, type ElementType, type ReactNode } from "react"
import { ArrowUpRightIcon, ChevronDownIcon } from "../../icons"
import { cn } from "../../utils/cn"
import { Avatar } from "../Avatar/Avatar"
import styles from "./Sidebar.module.css"

export interface SidebarProps {
  /** Top brand block (usually `<Brand />` inside a home link/button). */
  brand?: ReactNode
  /** Blocks under the brand (workspace switcher, search trigger). */
  header?: ReactNode
  /** Navigation groups. */
  children: ReactNode
  /** Pinned bottom area (settings, help, profile). */
  footer?: ReactNode
  /** Mobile (≤ 700px) drawer state. */
  mobileOpen?: boolean
  onMobileClose?: () => void
  "aria-label"?: string
  className?: string
}

/**
 * Fixed application sidebar (`.sidebar`): 232px desktop, 212px ≤ 1150px,
 * off-canvas drawer ≤ 700px.
 */
export function Sidebar({
  brand,
  header,
  children,
  footer,
  mobileOpen = false,
  onMobileClose,
  className,
  ...props
}: SidebarProps) {
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onMobileClose?.()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [mobileOpen, onMobileClose])
  return (
    <>
      {mobileOpen && <div className={styles.overlay} onClick={onMobileClose} aria-hidden />}
      <aside className={cn(styles.sidebar, mobileOpen && styles.open, className)}>
        {brand && <div className={styles.brand}>{brand}</div>}
        {header && <div className={styles.header}>{header}</div>}
        <nav className={styles.nav} aria-label={props["aria-label"] ?? "Ana menü"}>
          {children}
        </nav>
        {footer && <div className={styles.footer}>{footer}</div>}
      </aside>
    </>
  )
}

export function NavGroup({ label, children }: { label?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.group}>
      {label && <div className={styles.groupLabel}>{label}</div>}
      {children}
    </div>
  )
}

export interface NavItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode
  label: ReactNode
  active?: boolean
  /** Right side: `<CountBadge />`, `<Pill variant="new" />`… */
  trailing?: ReactNode
  /** Shows ↗ for items that open elsewhere. */
  external?: boolean
  /** Render as link instead of button. */
  href?: string
  /** Link component for client-side routing (e.g. Next.js `Link`). Default `a`. */
  linkAs?: ElementType
}

export function NavItem({ icon, label, active, trailing, external, href, linkAs: LinkComp = "a", className, ...props }: NavItemProps) {
  const content = (
    <>
      {icon}
      <span className={styles.itemLabel}>{label}</span>
      {trailing}
      {external && <ArrowUpRightIcon size={13} />}
    </>
  )
  const cls = cn(styles.item, active && styles.active, className)
  if (href)
    return (
      <LinkComp href={href} className={cls} aria-current={active ? "page" : undefined}>
        {content}
      </LinkComp>
    )
  return (
    <button type="button" className={cls} aria-current={active ? "page" : undefined} {...props}>
      {content}
    </button>
  )
}

export interface WorkspaceSwitcherProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "name"> {
  logo: ReactNode
  name: ReactNode
  description?: ReactNode
}

/** Company/workspace switch button (`.company-switch`). */
export function WorkspaceSwitcher({ logo, name, description, className, ...props }: WorkspaceSwitcherProps) {
  return (
    <button type="button" className={cn(styles.workspace, className)} {...props}>
      <span className={styles.workspaceLogo}>{logo}</span>
      <div>
        <strong>{name}</strong>
        {description && <span>{description}</span>}
      </div>
      <ChevronDownIcon size={14} />
    </button>
  )
}

export interface SidebarProfileProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "name"> {
  name: string
  title?: ReactNode
}

/** Current user row at the bottom of the sidebar (`.sidebar-profile`). */
export function SidebarProfile({ name, title, className, ...props }: SidebarProfileProps) {
  return (
    <button type="button" className={cn(styles.profile, className)} {...props}>
      <Avatar name={name} />
      <div>
        <strong>{name}</strong>
        {title && <span>{title}</span>}
      </div>
      <ChevronDownIcon size={14} />
    </button>
  )
}
