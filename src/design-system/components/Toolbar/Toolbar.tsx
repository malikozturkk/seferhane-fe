import type { ReactNode } from "react"
import { XIcon } from "../../icons"
import { cn } from "../../utils/cn"
import styles from "./Toolbar.module.css"

export interface ToolbarProps {
  /** Left side — usually `<SearchInput />`. */
  start?: ReactNode
  /** Right side — filter / export buttons, view toggle. */
  end?: ReactNode
  className?: string
}

/** Table toolbar row (`.toolbar`). */
export function Toolbar({ start, end, className }: ToolbarProps) {
  return (
    <div className={cn(styles.toolbar, className)} role="toolbar">
      {start}
      {end && <div className={styles.end}>{end}</div>}
    </div>
  )
}

export interface FilterChipProps {
  children: ReactNode
  onRemove?: () => void
  removeLabel?: string
  className?: string
}

/** Active filter chip with remove button (`.filter-chip`). */
export function FilterChip({ children, onRemove, removeLabel = "Filtreyi kaldır", className }: FilterChipProps) {
  return (
    <span className={cn(styles.chip, className)}>
      {children}
      {onRemove && (
        <button type="button" aria-label={removeLabel} onClick={onRemove}>
          <XIcon size={12} />
        </button>
      )}
    </span>
  )
}
