import type { ReactNode } from "react"
import { cn } from "../../utils/cn"
import styles from "./Timeline.module.css"

export interface TimelineItem {
  time?: ReactNode
  title: ReactNode
  description?: ReactNode
}

export interface TimelineProps {
  items: TimelineItem[]
  className?: string
}

/** Vertical activity feed (`.timeline`). */
export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn(styles.timeline, className)}>
      {items.map((item, i) => (
        <li key={i}>
          <span className={styles.dot} aria-hidden />
          {item.time && <small>{item.time}</small>}
          <strong>{item.title}</strong>
          {item.description && <p>{item.description}</p>}
        </li>
      ))}
    </ol>
  )
}
