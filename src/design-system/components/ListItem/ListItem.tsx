import type { ReactNode } from "react"
import { cn } from "../../utils/cn"
import styles from "./ListItem.module.css"

export interface ListItemProps {
  /** Icon tile, avatar or file icon. */
  leading?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Right side — button, amount, badge. */
  trailing?: ReactNode
  /** `document` = file rows (`.document-row`) · `finance` = amount rows (`.finance-row`) · `simple` = settings rows */
  variant?: "document" | "finance" | "simple"
  className?: string
}

/** Bordered list row used inside cards. */
export function ListItem({ leading, title, description, trailing, variant = "document", className }: ListItemProps) {
  return (
    <div className={cn(styles.row, styles[variant], className)}>
      {leading}
      <div className={styles.text}>
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </div>
      {trailing && <div className={styles.trailing}>{trailing}</div>}
    </div>
  )
}

export interface DescriptionListProps {
  items: Array<{ label: ReactNode; value: ReactNode; tone?: "default" | "positive" | "warning" }>
  /** `rows` = label ↔ value per line (`.summary-row`) · `grid` = 2-column facts (`.info-grid`) */
  layout?: "rows" | "grid"
  className?: string
}

/** Key/value facts. */
export function DescriptionList({ items, layout = "rows", className }: DescriptionListProps) {
  return (
    <dl className={cn(styles.dl, styles[layout], className)}>
      {items.map((item, i) => (
        <div key={i}>
          <dt>{item.label}</dt>
          <dd className={cn(item.tone === "positive" && styles.positive, item.tone === "warning" && styles.warning)}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
