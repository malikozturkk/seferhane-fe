import type { ReactNode } from "react"
import { ArrowLeftIcon } from "../../icons"
import { cn } from "../../utils/cn"
import { CountBadge } from "../Badge/Badge"
import styles from "./PageHeader.module.css"

/** Small uppercase overline ("OPERASYON"). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(styles.eyebrow, className)}>{children}</div>
}

export interface PageHeaderProps {
  title: ReactNode
  eyebrow?: ReactNode
  description?: ReactNode
  /** Inline element next to the title (status `<Badge />`). */
  titleAddon?: ReactNode
  /** Right-aligned buttons. */
  actions?: ReactNode
  /** Back link above the header (`.back-link`). */
  back?: { label: ReactNode; onClick?: () => void; href?: string }
  className?: string
}

/** Page title block (`.page-heading`). */
export function PageHeader({ title, eyebrow, description, titleAddon, actions, back, className }: PageHeaderProps) {
  return (
    <>
      {back &&
        (back.href ? (
          <a href={back.href} className={styles.back}>
            <ArrowLeftIcon size={15} />
            {back.label}
          </a>
        ) : (
          <button type="button" className={styles.back} onClick={back.onClick}>
            <ArrowLeftIcon size={15} />
            {back.label}
          </button>
        ))}
      <div className={cn(styles.header, className)}>
        <div className={styles.text}>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <div className={styles.titleRow}>
            <h1>{title}</h1>
            {titleAddon}
          </div>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </>
  )
}

export interface SectionHeaderProps {
  title: ReactNode
  count?: number | string
  action?: ReactNode
  /** Heading level. Default h2 */
  as?: "h2" | "h3"
  className?: string
}

/** Section title with counter and action (`.section-heading`). */
export function SectionHeader({ title, count, action, as: Tag = "h2", className }: SectionHeaderProps) {
  return (
    <div className={cn(styles.section, className)}>
      <Tag>
        {title}
        {count !== undefined && <CountBadge>{count}</CountBadge>}
      </Tag>
      {action}
    </div>
  )
}
