"use client"

import type { Key, ReactNode } from "react"
import {
  ArrowRightIcon,
  Button,
  CellSub,
  Clock3Icon,
  CompanyAvatar,
  DataTable,
  DownloadIcon,
  EmptyState,
  TableCellEntity,
  type DataTableSort,
} from "@/design-system"
import type { TripView } from "@/shared/contracts/operations"
import { exportCSV } from "@/shared/lib/csv"
import { relativeDay } from "@/shared/lib/format"
import { StatusBadge } from "@/shared/ui/status"

interface TripTableProps {
  trips: TripView[]
  onOpen: (t: TripView) => void
  /** Dashboard variant hides the documents column. */
  compact?: boolean
  footer?: ReactNode
  /** Server-side sorting (operations list). Omit for client-side sorting. */
  sort?: DataTableSort | null
  onSortChange?: (sort: DataTableSort | null) => void
  empty?: ReactNode
}

/** Trip list table (Make `TripTable`). Used by dashboard, operations and planning. */
export function TripTable({ trips, onOpen, compact = false, footer, sort, onSortChange, empty }: TripTableProps) {
  return (
    <DataTable<TripView>
      aria-label="Seferler"
      data={trips}
      getRowId={(t) => t.id}
      onRowClick={onOpen}
      selectable
      minWidth={650}
      selectionLabel={(n) => `${n} sefer seçildi`}
      selectionActions={(ids: Key[]) => (
        <Button
          size="sm"
          leftIcon={<DownloadIcon size={14} />}
          onClick={() =>
            exportCSV([
              ["Sefer no", "Müşteri", "Durum"],
              ...trips.filter((t) => ids.includes(t.id)).map((t) => [t.number, t.customerName, t.status]),
            ])
          }
        >
          Seçilenleri aktar
        </Button>
      )}
      empty={empty ?? <EmptyState />}
      footer={footer}
      sort={sort}
      onSortChange={onSortChange}
      columns={[
        {
          key: "number",
          header: "Sefer / Müşteri",
          sortValue: (t) => t.number,
          cell: (t, i) => (
            <TableCellEntity
              leading={<CompanyAvatar name={t.customerName} colorIndex={(i % 5) as 0} />}
              title={t.number}
              subtitle={t.customerName}
            />
          ),
        },
        {
          key: "route",
          header: "Güzergâh",
          cell: (t) => (
            <>
              <span className="flex items-center gap-2">
                {t.from}
                <ArrowRightIcon size={12} className="text-chart-comparison" />
                {t.to}
              </span>
              <CellSub>{t.type}</CellSub>
            </>
          ),
        },
        {
          key: "vehicle",
          header: "Araç / Şoför",
          cell: (t) => (
            <>
              <strong>{t.plate}</strong>
              <CellSub>{t.driverName}</CellSub>
            </>
          ),
        },
        { key: "status", header: "Durum", sortValue: (t) => t.status, cell: (t) => <StatusBadge status={t.status} /> },
        ...(compact
          ? []
          : [
              {
                key: "docs",
                header: "Evrak",
                hideOnMobile: true,
                cell: (t: TripView) => (
                  <span className={t.docsDone < t.docsTotal ? "text-warning-text" : "text-success-text"}>
                    {t.docsDone}/{t.docsTotal} belge
                  </span>
                ),
              },
            ]),
        {
          key: "time",
          header: "Teslimat",
          sortValue: (t) => `${t.date} ${t.time}`,
          cell: (t) => (
            <>
              <span className="inline-flex items-center gap-[5px]">
                <Clock3Icon size={12} className="text-ink-faint" />
                {t.time}
              </span>
              <CellSub>{relativeDay(t.date)}</CellSub>
            </>
          ),
        },
      ]}
    />
  )
}
