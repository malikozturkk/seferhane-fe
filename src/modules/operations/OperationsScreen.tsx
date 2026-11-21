"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import {
  ArrowRightIcon,
  Badge,
  Button,
  Card,
  DownloadIcon,
  EmptyState,
  FilterChip,
  LayoutGridIcon,
  ListIcon,
  PlusIcon,
  SearchInput,
  SegmentedControl,
  SlidersHorizontalIcon,
  Tabs,
  Toolbar,
  TruckIcon,
} from "@/design-system"
import { useAccess } from "@/app-shell/session"
import { ModulePage } from "@/app-shell/ModulePage"
import { NewTripModal } from "@/entities/trip/NewTripModal"
import { TripTable } from "@/entities/trip/TripTable"
import { useTrips, useTripStats } from "@/entities/trip/api"
import { moduleById } from "@/modules/registry"
import { exportCSV } from "@/shared/lib/csv"
import { ListFooter } from "@/shared/ui/ListFooter"
import { StatsRow } from "@/shared/ui/StatsRow"
import { statusTone } from "@/shared/ui/status"
import { useListState } from "@/shared/ui/useListState"

const TABS = moduleById("operations")!.tabs!

export function OperationsScreen() {
  const router = useRouter()
  const params = useSearchParams()
  const initialTab = params.get("tab") ?? TABS[0]
  const { canDo } = useAccess()
  const list = useListState({ tab: initialTab, pageSize: 10 })
  const [view, setView] = useState("list")
  const [newTrip, setNewTrip] = useState(false)
  const stats = useTripStats()
  const { data, isLoading } = useTrips({ ...list.params, tab: list.tab === TABS[0] ? undefined : list.tab })
  const tabs = TABS.includes(list.tab ?? "") ? TABS : [...TABS, list.tab!]
  const trips = data?.items ?? []
  const open = (id: string) => router.push(`/operations/${id}`)

  return (
    <ModulePage
      module="operations"
      actions={
        canDo("trips", "create") && (
          <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setNewTrip(true)}>
            Yeni sefer
          </Button>
        )
      }
    >
      <StatsRow stats={stats.data} />
      <Card>
        <Tabs variant="panel" items={tabs} value={list.tab} onChange={list.setTab} aria-label="Sefer filtreleri" />
        <Toolbar
          start={
            <SearchInput value={list.q} onValueChange={list.setQ} placeholder="Sefer no, müşteri, plaka veya güzergâh ara..." />
          }
          end={
            <>
              <Button size="sm" leftIcon={<SlidersHorizontalIcon size={14} />} onClick={() => list.toggleFilter("missingDocs")}>
                Filtrele
              </Button>
              <SegmentedControl
                variant="icon"
                aria-label="Görünüm"
                value={view}
                onChange={setView}
                options={[
                  { value: "list", label: <ListIcon size={16} />, "aria-label": "Liste görünümü" },
                  { value: "grid", label: <LayoutGridIcon size={15} />, "aria-label": "Kart görünümü" },
                ]}
              />
              {canDo("trips", "export") && (
                <Button
                  size="sm"
                  leftIcon={<DownloadIcon size={14} />}
                  onClick={() =>
                    exportCSV([["Sefer", "Müşteri", "Durum", "Gelir"], ...trips.map((t) => [t.number, t.customerName, t.status, t.revenue])])
                  }
                >
                  <span>Dışa aktar</span>
                </Button>
              )}
            </>
          }
        />
        {list.filter && (
          <div className="px-[21px] pb-3.5">
            <FilterChip onRemove={list.clearFilter}>Eksik evrakı olanlar</FilterChip>
          </div>
        )}
        {view === "list" ? (
          <TripTable
            trips={trips}
            onOpen={(t) => open(t.id)}
            sort={list.tableSort}
            onSortChange={list.onTableSort}
            empty={isLoading ? <div className="h-40" /> : undefined}
            footer={<ListFooter total={data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} noun="operasyon" />}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-[15px] px-5 pb-5 sm:grid-cols-2 md:grid-cols-3">
              {trips.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="rounded-xl border border-border-subtle p-[17px] text-left hover:bg-surface-row-hover"
                  onClick={() => open(t.id)}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-medium text-ink-emphasis">{t.number}</strong>
                    <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                  </div>
                  <h3 className="mt-[22px] mb-2.5 text-md font-semibold text-ink-heading">{t.customerName}</h3>
                  <p className="flex items-center gap-2 text-sm text-ink-muted">
                    {t.from}
                    <ArrowRightIcon size={14} />
                    {t.to}
                  </p>
                  <footer className="mt-5 flex justify-between border-t border-border-subtle pt-3.5 text-2xs text-ink-subtle">
                    <span className="inline-flex items-center gap-1.5">
                      <TruckIcon size={14} />
                      {t.plate}
                    </span>
                    <span>
                      {t.docsDone}/{t.docsTotal} belge
                    </span>
                  </footer>
                </button>
              ))}
            </div>
            {!trips.length && <EmptyState />}
            <div className="flex justify-between border-t border-border-faint px-[21px] py-3.5 text-2xs text-ink-faint">
              <ListFooter total={data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} noun="operasyon" />
            </div>
          </>
        )}
      </Card>
      <NewTripModal open={newTrip} onClose={() => setNewTrip(false)} />
    </ModulePage>
  )
}
