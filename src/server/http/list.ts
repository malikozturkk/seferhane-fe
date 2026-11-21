import type { Paginated, ParsedListParams } from "@/shared/contracts/common"
import { matches } from "@/shared/lib/format"

export interface ListSpec<T> {
  /** Fields searched by `q`. */
  search: (item: T) => Array<string | number | undefined | null>
  /** Server-side tab filters keyed by the visible tab label. */
  tabs?: Record<string, (item: T) => boolean>
  /** Named quick filters (`?filter=action`). */
  filters?: Record<string, (item: T) => boolean>
  /** Sortable columns keyed by the `sort` param. */
  sorts?: Record<string, (item: T) => string | number>
  /** Default ordering when no `sort` is given. */
  defaultSort?: (a: T, b: T) => number
}

/** Filter → search → sort → paginate. One implementation for every list endpoint. */
export function listItems<T>(items: T[], params: ParsedListParams, spec: ListSpec<T>): Paginated<T> {
  let rows = items
  const tab = params.tab && spec.tabs?.[params.tab]
  if (tab) rows = rows.filter(tab)
  const filter = params.filter && spec.filters?.[params.filter]
  if (filter) rows = rows.filter(filter)
  if (params.q) rows = rows.filter((r) => matches(spec.search(r), params.q))
  const sorter = params.sort && spec.sorts?.[params.sort]
  if (sorter) {
    const dir = params.order === "desc" ? -1 : 1
    rows = [...rows].sort((a, b) => {
      const va = sorter(a)
      const vb = sorter(b)
      const r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "tr")
      return r * dir
    })
  } else if (spec.defaultSort) {
    rows = [...rows].sort(spec.defaultSort)
  }
  const start = (params.page - 1) * params.pageSize
  return { items: rows.slice(start, start + params.pageSize), total: rows.length, page: params.page, pageSize: params.pageSize }
}
