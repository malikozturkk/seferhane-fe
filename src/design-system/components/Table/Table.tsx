import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react"
import { cn } from "../../utils/cn"
import styles from "./Table.module.css"

/* Low-level table primitives (`.data-table`). Use `DataTable` for the
   full feature set (selection, sorting, empty state, footer). */

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** Minimum width before horizontal scrolling kicks in (mobile). */
  minWidth?: number
}

export function Table({ className, minWidth, style, ...props }: TableProps) {
  return (
    <div className={styles.scroll}>
      <table className={cn(styles.table, className)} style={{ minWidth, ...style }} {...props} />
    </div>
  )
}

export function TableHead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />
}
export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  interactive?: boolean
  selected?: boolean
}

export function TableRow({ interactive, selected, className, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(interactive && styles.interactive, selected && styles.selected, className)}
      tabIndex={interactive ? 0 : undefined}
      {...props}
    />
  )
}

export function TableHeaderCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={className} {...props} />
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={className} {...props} />
}

/** Cell content: avatar/monogram + title + subtitle (`.cell-entity`). */
export function TableCellEntity({
  leading,
  title,
  subtitle,
}: {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
}) {
  return (
    <div className={styles.entity}>
      {leading}
      <div>
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
    </div>
  )
}

/** Secondary line under a cell value (`.cell-sub`). */
export function CellSub({ children }: { children: ReactNode }) {
  return <span className={styles.sub}>{children}</span>
}
