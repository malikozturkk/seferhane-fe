"use client"

import { Pagination } from "@/design-system"
import { pageCount } from "./useListState"

/** "N kayıt gösteriliyor" + pagination row for `DataTable` footers. */
export function ListFooter({
  total,
  page,
  pageSize,
  onPage,
  noun = "kayıt",
}: {
  total: number
  page: number
  pageSize: number
  onPage: (p: number) => void
  noun?: string
}) {
  const count = pageCount(total, pageSize)
  return (
    <>
      <span>
        {total} {noun} gösteriliyor
      </span>
      <Pagination page={page} pageCount={count} onPageChange={onPage} variant={count > 5 ? "full" : "compact"} />
    </>
  )
}
