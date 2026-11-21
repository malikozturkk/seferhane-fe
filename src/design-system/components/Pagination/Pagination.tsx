"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "../../icons"
import { cn } from "../../utils/cn"
import { IconButton } from "../IconButton/IconButton"
import styles from "./Pagination.module.css"

export interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  /** `compact` = "Sayfa 1 / 3" + arrows (reference `.table-footer`) · `full` = numbered */
  variant?: "compact" | "full"
  /** Pages shown on each side of the current page (full variant). */
  siblings?: number
  className?: string
}

function range(page: number, count: number, siblings: number) {
  const pages: Array<number | "…"> = []
  const start = Math.max(2, page - siblings)
  const end = Math.min(count - 1, page + siblings)
  pages.push(1)
  if (start > 2) pages.push("…")
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < count - 1) pages.push("…")
  if (count > 1) pages.push(count)
  return pages
}

/**
 * Page navigation. The reference only shows "Sayfa 1 / 1" in table footers;
 * numbered buttons reuse the view-toggle styling.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  variant = "compact",
  siblings = 1,
  className,
}: PaginationProps) {
  const count = Math.max(1, pageCount)
  const go = (p: number) => onPageChange(Math.min(count, Math.max(1, p)))
  return (
    <nav aria-label="Sayfalama" className={cn(styles.pagination, className)}>
      <IconButton
        aria-label="Önceki sayfa"
        icon={<ChevronLeftIcon size={15} />}
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      />
      {variant === "compact" ? (
        <span className={styles.label} aria-live="polite">
          Sayfa {page} / {count}
        </span>
      ) : (
        <ul className={styles.pages}>
          {range(page, count, siblings).map((p, i) =>
            p === "…" ? (
              <li key={`gap-${i}`} className={styles.gap} aria-hidden>
                …
              </li>
            ) : (
              <li key={p}>
                <button
                  type="button"
                  className={cn(styles.page, p === page && styles.current)}
                  aria-current={p === page ? "page" : undefined}
                  aria-label={`Sayfa ${p}`}
                  onClick={() => go(p)}
                >
                  {p}
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      <IconButton
        aria-label="Sonraki sayfa"
        icon={<ChevronRightIcon size={15} />}
        disabled={page >= count}
        onClick={() => go(page + 1)}
      />
    </nav>
  )
}
