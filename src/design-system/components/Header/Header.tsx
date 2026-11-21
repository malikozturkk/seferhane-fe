import type { ReactNode } from "react"
import { MenuIcon } from "../../icons"
import { cn } from "../../utils/cn"
import { IconButton } from "../IconButton/IconButton"
import styles from "./Header.module.css"

export interface HeaderProps {
  /** Left side — usually `<Breadcrumb />`. */
  start?: ReactNode
  /** Right side actions (date, search, notifications, avatar). */
  end?: ReactNode
  /** Shows the hamburger on mobile (≤ 700px). */
  onMenuClick?: () => void
  menuLabel?: string
  className?: string
}

/** Application top bar (`.topbar`). */
export function Header({ start, end, onMenuClick, menuLabel = "Menüyü aç", className }: HeaderProps) {
  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.start}>
        {onMenuClick && (
          <IconButton
            aria-label={menuLabel}
            icon={<MenuIcon size={21} />}
            className={styles.menu}
            onClick={onMenuClick}
          />
        )}
        {start}
      </div>
      {end && <div className={styles.end}>{end}</div>}
    </header>
  )
}

/** 1×21px vertical separator for header actions (`.top-divider`). */
export function HeaderDivider() {
  return <span className={styles.divider} aria-hidden />
}
