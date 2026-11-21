"use client"

import { useMemo, useState, type Key, type ReactNode } from "react"
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon } from "../../icons"
import { cn } from "../../utils/cn"
import { Checkbox } from "../Form/Checkbox"
import { EmptyState } from "../EmptyState/EmptyState"
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "./Table"
import styles from "./Table.module.css"

export interface DataTableColumn<T> {
  key: string
  header: ReactNode
  /** Cell renderer. Defaults to `row[key]`. */
  cell?: (row: T, index: number) => ReactNode
  /** Enables header sorting; return a comparable value. */
  sortValue?: (row: T) => string | number
  align?: "left" | "right" | "center"
  width?: number | string
  /** Hide on narrow screens (≤ 700px). */
  hideOnMobile?: boolean
}

export interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  getRowId: (row: T) => Key
  onRowClick?: (row: T) => void
  /** Adds a leading checkbox column and the selection bar. */
  selectable?: boolean
  selectedIds?: Key[]
  onSelectionChange?: (ids: Key[]) => void
  /** Actions shown in the selection bar ("Seçilenleri aktar"). */
  selectionActions?: (ids: Key[]) => ReactNode
  /** Selection bar label. Default: "{n} kayıt seçildi" */
  selectionLabel?: (count: number) => ReactNode
  /** Trailing chevron for clickable rows. Default true when `onRowClick` is set. */
  showRowChevron?: boolean
  empty?: ReactNode
  /** Footer row (e.g. "5 operasyon gösteriliyor" + `<Pagination />`). */
  footer?: ReactNode
  minWidth?: number
  /**
   * Controlled sorting (server-side lists). When `onSortChange` is given the
   * table does not reorder rows itself; it only reports the requested order.
   */
  sort?: DataTableSort | null
  onSortChange?: (sort: DataTableSort | null) => void
  "aria-label": string
  className?: string
}

export interface DataTableSort {
  key: string
  dir: "asc" | "desc"
}

/** Feature-complete table used across modules (reference: `TripTable`). */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  onRowClick,
  selectable = false,
  selectedIds,
  onSelectionChange,
  selectionActions,
  selectionLabel = (n) => `${n} kayıt seçildi`,
  showRowChevron,
  empty,
  footer,
  minWidth,
  sort: sortProp,
  onSortChange,
  className,
  ...props
}: DataTableProps<T>) {
  const [innerSelected, setInnerSelected] = useState<Key[]>([])
  const selected = selectedIds ?? innerSelected
  const setSelected = (ids: Key[]) => {
    if (selectedIds === undefined) setInnerSelected(ids)
    onSelectionChange?.(ids)
  }
  const [innerSort, setInnerSort] = useState<DataTableSort | null>(null)
  const controlled = onSortChange !== undefined
  const sort = controlled ? (sortProp ?? null) : innerSort
  const setSort = (next: DataTableSort | null) => (controlled ? onSortChange(next) : setInnerSort(next))
  const rows = useMemo(() => {
    if (controlled) return data
    const col = sort && columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return data
    const get = col.sortValue
    return [...data].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      const r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "tr")
      return sort!.dir === "asc" ? r : -r
    })
  }, [data, columns, sort, controlled])
  const chevron = showRowChevron ?? Boolean(onRowClick)
  const allIds = data.map(getRowId)
  const allSelected = data.length > 0 && allIds.every((id) => selected.includes(id))
  const someSelected = !allSelected && allIds.some((id) => selected.includes(id))

  return (
    <div className={className}>
      <Table aria-label={props["aria-label"]} minWidth={minWidth}>
        <TableHead>
          <tr>
            {selectable && (
              <TableHeaderCell className={styles.checkCell}>
                <Checkbox
                  aria-label="Tümünü seç"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(e) => setSelected(e.target.checked ? allIds : [])}
                />
              </TableHeaderCell>
            )}
            {columns.map((c) => {
              const active = sort?.key === c.key
              return (
                <TableHeaderCell
                  key={c.key}
                  style={{ width: c.width, textAlign: c.align }}
                  className={cn(c.hideOnMobile && styles.hideMobile)}
                  aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() =>
                        setSort(
                          active && sort!.dir === "asc"
                            ? { key: c.key, dir: "desc" }
                            : active && sort!.dir === "desc"
                              ? null
                              : { key: c.key, dir: "asc" },
                        )
                      }
                    >
                      {c.header}
                      {active && sort!.dir === "asc" ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} />}
                    </button>
                  ) : (
                    c.header
                  )}
                </TableHeaderCell>
              )
            })}
            {chevron && <TableHeaderCell aria-label="Aç" />}
          </tr>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => {
            const id = getRowId(row)
            const isSelected = selected.includes(id)
            return (
              <TableRow
                key={id}
                interactive={Boolean(onRowClick)}
                selected={isSelected}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" && e.target === e.currentTarget) onRowClick(row)
                      }
                    : undefined
                }
              >
                {selectable && (
                  <TableCell onClick={(e) => e.stopPropagation()} className={styles.checkCell}>
                    <Checkbox
                      aria-label={`${String(id)} seç`}
                      checked={isSelected}
                      onChange={(e) =>
                        setSelected(e.target.checked ? [...selected, id] : selected.filter((x) => x !== id))
                      }
                    />
                  </TableCell>
                )}
                {columns.map((c) => (
                  <TableCell
                    key={c.key}
                    style={{ textAlign: c.align }}
                    className={cn(c.hideOnMobile && styles.hideMobile)}
                  >
                    {c.cell ? c.cell(row, i) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </TableCell>
                ))}
                {chevron && (
                  <TableCell>
                    <ChevronRightIcon size={15} className={styles.chevron} />
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {!data.length && (empty ?? <EmptyState />)}
      {selectable && selected.length > 0 && (
        <div className={styles.selectionBar} role="status">
          <span>{selectionLabel(selected.length)}</span>
          {selectionActions?.(selected)}
        </div>
      )}
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  )
}
