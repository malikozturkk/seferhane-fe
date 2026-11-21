"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  AreaChart,
  Badge,
  BreakdownChart,
  Button,
  Card,
  DataTable,
  DownloadIcon,
  Grid,
  Select,
  Skeleton,
  TableCellEntity,
  categoricalPalette,
} from "@/design-system"
import { ModuleWorkspace } from "@/app-shell/ModuleWorkspace"
import { useAccess } from "@/app-shell/session"
import { useApiQuery } from "@/shared/api/query"
import type { CostOverview, ProfitRow } from "@/shared/contracts/commercial"
import { exportCSV } from "@/shared/lib/csv"
import { money, percent } from "@/shared/lib/format"

const GROUP: Record<string, { group: string; title: string; first: string }> = {
  "Genel bakış": { group: "trip", title: "Sefer bazlı kârlılık", first: "Sefer / Müşteri" },
  "Sefer kârlılığı": { group: "trip", title: "Sefer bazlı kârlılık", first: "Sefer / Müşteri" },
  "Müşteri bazlı": { group: "customer", title: "Müşteri kârlılığı", first: "Müşteri" },
  "Hat bazlı": { group: "route", title: "Hat kârlılığı", first: "Güzergâh" },
  "Bütçe & gerçekleşen": { group: "trip", title: "Bütçe / gerçekleşen karşılaştırması", first: "Sefer / Müşteri" },
}
const BREAKDOWN_COLOR = [categoricalPalette[0], categoricalPalette[1], categoricalPalette[6], categoricalPalette[4], categoricalPalette[8]]

export function CostsScreen() {
  const router = useRouter()
  const { canDo } = useAccess()
  const [period, setPeriod] = useState<"week" | "month">("week")
  const { data: overview } = useApiQuery<CostOverview>(["costs", "overview"], "/costs/overview")
  const allTrips = useApiQuery<ProfitRow[]>(["costs", "profit", "trip"], "/costs/profitability", { group: "trip" })

  return (
    <ModuleWorkspace
      module="costs"
      customTabs={Object.keys(GROUP)}
      stats={
        overview && [
          { label: "Toplam gelir", value: money(overview.revenue), caption: "Seçili operasyonlar" },
          { label: "Toplam gider", value: money(overview.cost), caption: "Kaynağa bağlı maliyetler" },
          { label: "Brüt kâr", value: money(overview.profit), caption: "Gelir − toplam gider", tone: "positive" },
          { label: "Brüt kâr marjı", value: percent(overview.profit, overview.revenue), caption: "Hedef: %22", tone: "positive" },
        ]
      }
      actions={() =>
        canDo("costs", "export") && (
          <Button
            leftIcon={<DownloadIcon size={15} />}
            onClick={() =>
              exportCSV([["Sefer", "Gelir", "Gider", "Kâr"], ...(allTrips.data ?? []).map((r) => [r.label, r.revenue, r.cost, r.profit])], "seferhane-karlilik")
            }
          >
            Raporu indir
          </Button>
        )
      }
    >
      {(tab) => (
        <>
          {tab === "Genel bakış" && (
            <Grid layout="charts" className="mb-6">
              <Card
                title="Gelir & gider trendi"
                subtitle="Dönemsel finansal performans"
                action={
                  <Select
                    variant="compact"
                    aria-label="Dönem"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as "week" | "month")}
                    options={[
                      { value: "week", label: "Son 7 gün" },
                      { value: "month", label: "Son 30 gün" },
                    ]}
                  />
                }
              >
                <div className="mx-[21px] mt-[13px] mb-[9px]">
                  {overview ? (
                    <AreaChart
                      aria-label="Gelir ve gider trendi"
                      data={overview.series[period]}
                      series={[
                        { key: "revenue", label: "Gelir" },
                        { key: "cost", label: "Gider" },
                      ]}
                    />
                  ) : (
                    <Skeleton height={200} shape="block" />
                  )}
                </div>
              </Card>
              <Card title="Gider dağılımı">
                <div className="px-[22px] pt-7 pb-3">
                  {overview && (
                    <BreakdownChart
                      aria-label="Gider dağılımı"
                      data={overview.breakdown.map((b, i) => ({ label: b.label, value: b.value, color: BREAKDOWN_COLOR[i % BREAKDOWN_COLOR.length] }))}
                    />
                  )}
                </div>
              </Card>
            </Grid>
          )}
          <ProfitTable tab={tab} onOpenTrip={(id) => router.push(`/operations/${id}`)} />
        </>
      )}
    </ModuleWorkspace>
  )
}

function ProfitTable({ tab, onOpenTrip }: { tab: string; onOpenTrip: (id: string) => void }) {
  const cfg = GROUP[tab]
  const { data } = useApiQuery<ProfitRow[]>(["costs", "profit", cfg.group], "/costs/profitability", { group: cfg.group })
  const budget = tab === "Bütçe & gerçekleşen"
  return (
    <Card title={cfg.title} subtitle="Masraf, yakıt ve cezalar kaynak kayıtlardan hesaplanır." headerSpacing="loose">
      <DataTable<ProfitRow>
        aria-label={cfg.title}
        data={data ?? []}
        getRowId={(r) => r.key}
        onRowClick={cfg.group === "trip" ? (r) => r.tripId && onOpenTrip(r.tripId) : undefined}
        minWidth={640}
        columns={[
          { key: "label", header: cfg.first, sortValue: (r) => r.label, cell: (r) => <TableCellEntity title={r.label} subtitle={r.sub} /> },
          { key: "revenue", header: "Gelir", align: "right", sortValue: (r) => r.revenue, cell: (r) => money(r.revenue) },
          { key: "cost", header: "Gider", align: "right", sortValue: (r) => r.cost, cell: (r) => money(r.cost) },
          ...(budget
            ? [
                {
                  key: "variance",
                  header: "Bütçe sapması",
                  align: "right" as const,
                  cell: (r: ProfitRow) => (
                    <span className={(r.budgetVariance ?? 0) >= 0 ? "text-success-text" : "text-warning-text"}>
                      {(r.budgetVariance ?? 0) >= 0 ? "+" : "−"}%{Math.abs((r.budgetVariance ?? 0) * 100).toFixed(1).replace(".", ",")}
                    </span>
                  ),
                },
              ]
            : []),
          { key: "profit", header: "Brüt kâr", align: "right", sortValue: (r) => r.profit, cell: (r) => <strong>{money(r.profit)}</strong> },
          { key: "margin", header: "Marj", sortValue: (r) => r.margin, cell: (r) => <Badge tone={r.margin >= 0.22 ? "green" : "amber"}>{percent(r.profit, r.revenue)}</Badge> },
        ]}
      />
    </Card>
  )
}
