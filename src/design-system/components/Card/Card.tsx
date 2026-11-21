import type { ElementType, HTMLAttributes, ReactNode } from "react"
import { ArrowRightIcon, ArrowUpRightIcon } from "../../icons"
import { cn } from "../../utils/cn"
import { IconTile, type IconTileTone } from "../IconTile/IconTile"
import styles from "./Card.module.css"

/* ------------------------------------------------------------------ */
/* Card (`.panel`)                                                     */
/* ------------------------------------------------------------------ */

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode
  subtitle?: ReactNode
  /** Header right side (select, text button, icon button, count…). */
  action?: ReactNode
  /** `none` = children handle their own spacing · `md` = 20px body padding */
  padding?: "none" | "md"
  /** Extra space under the header (table cards). */
  headerSpacing?: "default" | "loose"
  as?: ElementType
  children?: ReactNode
}

export function Card({
  title,
  subtitle,
  action,
  padding = "none",
  headerSpacing = "default",
  as: Tag = "section",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Tag className={cn(styles.card, className)} {...props}>
      {(title || action) && (
        <div className={cn(styles.head, headerSpacing === "loose" && styles.headLoose)}>
          <div>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {padding === "md" ? <div className={styles.body}>{children}</div> : children}
    </Tag>
  )
}

/* ------------------------------------------------------------------ */
/* MetricCard (`.metric`)                                              */
/* ------------------------------------------------------------------ */

export interface MetricCardProps {
  label: ReactNode
  value: ReactNode
  /** Chip next to the value ("3 teslim", "%24,1"). */
  change?: ReactNode
  /** Footnote line. */
  foot?: ReactNode
  icon?: ReactNode
  /** `warning` = warm amber variant ("Aksiyon bekleyenler"). */
  tone?: "default" | "warning"
  onClick?: () => void
  className?: string
}

export function MetricCard({ label, value, change, foot, icon, tone = "default", onClick, className }: MetricCardProps) {
  const Tag = onClick ? "button" : "div"
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(styles.metric, tone === "warning" && styles.warm, onClick && styles.clickable, className)}
    >
      <div className={styles.metricTop}>
        <span>{label}</span>
        {icon && <IconTile icon={icon} size="sm" tone={tone === "warning" ? "warm" : "neutral"} className={styles.metricIcon} />}
      </div>
      <div className={styles.metricValue}>
        {value}
        {change && (
          <span className={styles.metricChange}>
            {tone !== "warning" && <ArrowUpRightIcon size={12} />}
            {change}
          </span>
        )}
      </div>
      {foot && <div className={styles.metricFoot}>{foot}</div>}
    </Tag>
  )
}

/** Responsive KPI grid (`.metrics-grid`): 4 → 2 columns. */
export function MetricGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(styles.metricGrid, className)}>{children}</div>
}

/* ------------------------------------------------------------------ */
/* StatGroup (`.mini-stats`)                                           */
/* ------------------------------------------------------------------ */

export interface StatItem {
  label: ReactNode
  value: ReactNode
  /** Inline muted suffix next to the value ("bu görünümde"). */
  suffix?: ReactNode
  /** Line under the value. */
  caption?: ReactNode
  tone?: "default" | "positive" | "warning"
}

export interface StatGroupProps {
  items: StatItem[]
  className?: string
}

export function StatGroup({ items, className }: StatGroupProps) {
  return (
    <div className={cn(styles.stats, className)} style={{ ["--stat-cols" as string]: items.length }}>
      {items.map((item, i) => (
        <div key={i}>
          <span>{item.label}</span>
          <strong className={cn(item.tone === "positive" && styles.positive, item.tone === "warning" && styles.warning)}>
            {item.value}
            {item.suffix && <small>{item.suffix}</small>}
          </strong>
          {item.caption && <small>{item.caption}</small>}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* ActionCard (`.attention-card`)                                      */
/* ------------------------------------------------------------------ */

export interface ActionCardProps {
  icon: ReactNode
  tone?: Extract<IconTileTone, "orange" | "purple" | "blue" | "green">
  title: ReactNode
  description?: ReactNode
  /** Link text at the bottom ("Belgeleri incele"). */
  linkLabel?: ReactNode
  /** Small amber dot in the corner. */
  indicator?: boolean
  onClick?: () => void
  className?: string
}

export function ActionCard({
  icon,
  tone = "orange",
  title,
  description,
  linkLabel,
  indicator = true,
  onClick,
  className,
}: ActionCardProps) {
  return (
    <button type="button" className={cn(styles.action, className)} onClick={onClick}>
      <IconTile icon={icon} tone={tone} />
      <div>
        <h4>{title}</h4>
        {description && <p>{description}</p>}
        {linkLabel && (
          <span>
            {linkLabel}
            <ArrowRightIcon size={12} />
          </span>
        )}
      </div>
      {indicator && <span className={styles.actionDot} aria-hidden />}
    </button>
  )
}
