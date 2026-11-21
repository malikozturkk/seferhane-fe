import type { ReactNode } from "react"
import { SearchIcon } from "../../icons"
import { cn } from "../../utils/cn"
import styles from "./EmptyState.module.css"

export interface EmptyStateProps {
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  /** `compact` reduces vertical padding (e.g. inside a planning column). */
  size?: "md" | "compact"
  className?: string
}

/** Empty / no-results state (`.empty`). Defaults match the reference copy. */
export function EmptyState({
  title = "Aradığınız kayıt bulunamadı",
  description = "Farklı bir arama yapın veya filtrelerinizi temizleyin.",
  icon = <SearchIcon size={24} />,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(styles.empty, styles[size], className)}>
      <div className={styles.icon} aria-hidden>
        {icon}
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
