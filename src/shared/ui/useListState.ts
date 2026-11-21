"use client"

import { useDeferredValue, useMemo, useState } from "react"
import type { ListParams } from "../contracts/common"

/** Search / tab / sort / filter / page state for list screens → API `ListParams`. */
export function useListState(initial: { tab?: string; pageSize?: number; sort?: string; order?: "asc" | "desc" } = {}) {
  const [q, setQ] = useState("")
  const [tab, setTabState] = useState(initial.tab)
  const [filter, setFilter] = useState<string | undefined>()
  const [sort, setSort] = useState<{ sort?: string; order?: "asc" | "desc" }>({ sort: initial.sort, order: initial.order })
  const [page, setPage] = useState(1)
  const pageSize = initial.pageSize ?? 25
  const deferredQ = useDeferredValue(q)

  const params = useMemo<ListParams>(
    () => ({ q: deferredQ || undefined, tab, filter, sort: sort.sort, order: sort.order, page, pageSize }),
    [deferredQ, tab, filter, sort, page, pageSize],
  )

  return {
    params,
    q,
    setQ: (v: string) => {
      setQ(v)
      setPage(1)
    },
    tab,
    /** Tab switch resets search, filter and page (Make behaviour). */
    setTab: (v: string) => {
      setTabState(v)
      setQ("")
      setFilter(undefined)
      setPage(1)
    },
    filter,
    toggleFilter: (key: string) => {
      setFilter((f) => (f === key ? undefined : key))
      setPage(1)
    },
    clearFilter: () => setFilter(undefined),
    setSort,
    /** Props for `DataTable` controlled (server-side) sorting. */
    tableSort: sort.sort ? { key: sort.sort, dir: sort.order ?? "asc" } : null,
    onTableSort: (next: { key: string; dir: "asc" | "desc" } | null) => {
      setSort(next ? { sort: next.key, order: next.dir } : {})
      setPage(1)
    },
    page,
    setPage,
    pageSize,
  }
}

export const pageCount = (total: number, pageSize: number) => Math.max(1, Math.ceil(total / pageSize))
