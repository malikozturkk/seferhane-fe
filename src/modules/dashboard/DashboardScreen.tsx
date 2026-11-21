"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  ActionCard,
  AreaChart,
  ArrowRightIcon,
  ArrowUpRightIcon,
  Button,
  CalendarDaysIcon,
  Card,
  ChartSummary,
  ChevronDownIcon,
  CircleCheckIcon,
  Clock3Icon,
  DonutChart,
  FileClockIcon,
  Grid,
  IconButton,
  MetricCard,
  MetricGrid,
  MoreHorizontalIcon,
  PageHeader,
  PlusIcon,
  RouteIcon,
  SectionHeader,
  Select,
  ShieldAlertIcon,
  ShieldCheckIcon,
  Skeleton,
  StatusIndicator,
  TrendingUpIcon,
  TruckIcon,
  statusPalette,
} from "@/design-system"
import { useAccess } from "@/app-shell/session"
import { ModulePage } from "@/app-shell/ModulePage"
import { NewTripModal } from "@/entities/trip/NewTripModal"
import { TripTable } from "@/entities/trip/TripTable"
import { useTrips } from "@/entities/trip/api"
import { useApiQuery } from "@/shared/api/query"
import type { TrendPoint } from "@/shared/contracts/commercial"
import type { DashboardData } from "@/shared/contracts/management"
import { today } from "@/shared/lib/clock"
import { formatDateLong, money, percent } from "@/shared/lib/format"

const VIEWS: Array<{ key: DashboardData["view"]; label: string }> = [
  { key: "executive", label: "Genel müdür" },
  { key: "operations", label: "Operasyon müdürü" },
  { key: "me", label: "Benim günüm" },
]
const METRIC_ICON: Record<string, typeof RouteIcon> = {
  trips: RouteIcon,
  fleet: TruckIcon,
  mine: TruckIcon,
  profit: TrendingUpIcon,
  actions: ShieldAlertIcon,
  loads: RouteIcon,
  overdue: Clock3Icon,
  pod: FileClockIcon,
}
const STATUS_COLOR: Record<string, string> = {
  Yolda: statusPalette.transit,
  Yüklemede: statusPalette.loading,
  Planlandı: statusPalette.planned,
  "Teslim edildi": statusPalette.delivered,
  "Evrak bekliyor": statusPalette.docs,
}
const ATTENTION_ICON = { documents: ShieldCheckIcon, pod: FileClockIcon, tasks: Clock3Icon } as const

export function DashboardScreen() {
  const router = useRouter()
  const { me, canDo } = useAccess()
  const [view, setView] = useState(0)
  const [period, setPeriod] = useState<"week" | "month">("week")
  const [newTrip, setNewTrip] = useState(false)
  const { data } = useApiQuery<DashboardData>(["dashboard"], "/dashboard", { view: VIEWS[view].key })
  const trend = useApiQuery<{ week: TrendPoint[]; month: TrendPoint[]; weekTotal: Totals; monthTotal: Totals }>(
    ["dashboard", "trend"],
    "/dashboard/trend",
  )
  const todays = useTrips({ date: today(), pageSize: 50 }, canDo("trips", "view"))
  const totals = period === "week" ? trend.data?.weekTotal : trend.data?.monthTotal

  return (
    <ModulePage module="dashboard" hideHeader>
      <PageHeader
        eyebrow="HER SEFERDE BİR ADIM ÖNDE"
        title={
          <>
            Günaydın, {me?.user.firstName}{" "}
            <span className="inline-block size-1.5 rounded-full bg-success align-[6px]" aria-hidden />
          </>
        }
        description="Yeni bir gün, yolunda giden operasyonlar. İşte bugünkü genel görünümünüz."
        actions={
          <>
            <Button rightIcon={<ChevronDownIcon size={14} />} onClick={() => setView((v) => (v + 1) % VIEWS.length)}>
              {VIEWS[view].label}
            </Button>
            {canDo("trips", "create") && (
              <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setNewTrip(true)}>
                Yeni sefer
              </Button>
            )}
          </>
        }
      />

      <div className="mb-[15px] flex items-center justify-between">
        <StatusIndicator
          label={
            <span className="text-xs font-medium text-ink-secondary">
              Operasyon özeti <span className="text-ink-subtle">/</span>{" "}
              <span className="font-normal text-ink-subtle">{formatDateLong(today())}</span>
            </span>
          }
        />
        <span className="max-sm:hidden">
          <Button variant="link" leftIcon={<CalendarDaysIcon size={14} />} rightIcon={<ChevronDownIcon size={13} />} onClick={() => router.push("/reports")}>
            Bugün
          </Button>
        </span>
      </div>

      <div className="mb-[23px]">
        {data ? (
          <MetricGrid>
            {data.metrics.map((m) => {
              const Icon = METRIC_ICON[m.key] ?? RouteIcon
              return (
                <MetricCard
                  key={m.key}
                  label={m.label}
                  value={m.value}
                  change={m.change}
                  foot={m.foot}
                  tone={m.tone === "warning" ? "warning" : "default"}
                  icon={<Icon size={18} />}
                  onClick={() => router.push(m.href)}
                />
              )
            })}
          </MetricGrid>
        ) : (
          <Skeleton height={124} shape="block" />
        )}
      </div>

      <Grid layout="charts" className="mb-6">
        <Card
          title="Gelir & gider görünümü"
          subtitle="Operasyonunuzun finansal ritmini takip edin."
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
          <div className="mx-[22px] mt-[25px] max-sm:mx-[17px]">
            <ChartSummary
              items={[
                { label: "Toplam gelir", value: money(totals?.revenue ?? 0), color: "var(--color-chart-primary)", change: period === "week" ? "%6,8" : "%4,1" },
                { label: "Toplam gider", value: money(totals?.cost ?? 0), color: "var(--color-chart-comparison)" },
              ]}
              net={{ label: "Brüt kâr", value: percent(totals?.profit ?? 0, totals?.revenue ?? 0) }}
            />
          </div>
          <div className="mx-[21px] mt-[13px] mb-[9px]">
            {trend.data ? (
              <AreaChart
                aria-label="Gelir ve gider eğilim grafiği"
                data={trend.data[period]}
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

        <Card
          title="Bugünkü operasyon"
          action={<IconButton aria-label="Operasyon detayları" icon={<MoreHorizontalIcon size={18} />} onClick={() => router.push("/operations")} />}
        >
          <div className="px-[21px] pt-[7px] pb-[15px]">
            {data && (
              <DonutChart
                aria-label={`${data.todayTripCount} seferin durum dağılımı`}
                centerValue={data.todayTripCount}
                centerLabel="bugünkü sefer"
                data={data.statusBreakdown.map((s) => ({ label: s.status, value: s.count, color: STATUS_COLOR[s.status] }))}
                onSelect={(d) => router.push(`/operations?tab=${encodeURIComponent(d.label)}`)}
              />
            )}
          </div>
          {data && (
            <div className="mx-[18px] mb-4 flex items-center gap-[9px] rounded-md border border-sage-200 bg-sage-100 px-2.5 py-[11px] text-sage-600">
              <span className="flex rounded-full bg-sage-150 p-[5px] text-sage-500">
                <CircleCheckIcon size={17} />
              </span>
              <div className="flex-1">
                <strong className="block text-xs font-medium text-sage-700">{data.onTime.rate} zamanında teslimat</strong>
                <span className="mt-1 block text-3xs text-sage-subtle">{data.onTime.text}</span>
              </div>
              <ArrowUpRightIcon size={16} />
            </div>
          )}
        </Card>
      </Grid>

      {data && (
        <>
          <SectionHeader
            title="Dikkat gerektirenler"
            count={data.attentionTotal}
            action={
              <Button variant="link" rightIcon={<ArrowRightIcon size={14} />} onClick={() => router.push("/tasks")}>
                Tümünü görüntüle
              </Button>
            }
          />
          <Grid layout="cols-3" className="mb-6">
            {data.attention.map((a) => {
              const Icon = ATTENTION_ICON[a.key as keyof typeof ATTENTION_ICON] ?? ShieldCheckIcon
              return (
                <ActionCard
                  key={a.key}
                  icon={<Icon size={20} />}
                  tone={a.tone}
                  title={a.title}
                  description={a.text}
                  linkLabel={a.linkLabel}
                  onClick={() => router.push(a.href)}
                />
              )
            })}
          </Grid>
        </>
      )}

      {canDo("trips", "view") && (
        <Card
          title="Güncel seferler"
          subtitle="Bugünkü operasyonlarınızdan son hareketler."
          headerSpacing="loose"
          action={
            <Button variant="link" rightIcon={<ArrowUpRightIcon size={14} />} onClick={() => router.push("/operations")}>
              Tüm seferler
            </Button>
          }
        >
          <TripTable trips={todays.data?.items ?? []} onOpen={(t) => router.push(`/operations/${t.id}`)} compact />
        </Card>
      )}

      <div className="flex flex-wrap justify-between gap-3 pt-5 text-3xs text-ink-faint">
        <StatusIndicator size="sm" label="Tüm sistemler normal çalışıyor" />
        <span className="mr-auto ml-5">Son güncelleme: az önce</span>
        <span>Her sefer planlı. Her detay yerinde.</span>
      </div>

      <NewTripModal open={newTrip} onClose={() => setNewTrip(false)} />
    </ModulePage>
  )
}

interface Totals {
  revenue: number
  cost: number
  profit: number
}
