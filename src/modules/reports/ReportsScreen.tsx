"use client"

import { useState } from "react"
import {
  Alert,
  AreaChart,
  Badge,
  Button,
  CalendarClockIcon,
  Card,
  ChartPieIcon,
  DatePicker,
  DownloadIcon,
  EmptyState,
  FileTextIcon,
  FormField,
  Grid,
  IconButton,
  IconTile,
  Modal,
  ModalBody,
  ModalFooter,
  Pill,
  ShieldCheckIcon,
  SparklesIcon,
  StatGroup,
  TargetIcon,
  TrendingUpIcon,
  UsersIcon,
} from "@/design-system"
import { ModuleWorkspace } from "@/app-shell/ModuleWorkspace"
import { useAccess } from "@/app-shell/session"
import { http, errorMessage } from "@/shared/api/http"
import { useApiMutation, useApiQuery } from "@/shared/api/query"
import type { TrendPoint } from "@/shared/contracts/commercial"
import type { ReportResult, ReportTemplate, SavedReport } from "@/shared/contracts/management"
import { exportCSV } from "@/shared/lib/csv"
import { formatDate, formatDateLong } from "@/shared/lib/format"
import { today } from "@/shared/lib/clock"

const ICONS = { target: TargetIcon, shield: ShieldCheckIcon, trend: TrendingUpIcon, users: UsersIcon, file: FileTextIcon, sparkles: SparklesIcon } as const
const KEY = ["reports"]

export function ReportsScreen() {
  const { canDo, me } = useAccess()
  const { data } = useApiQuery<{ templates: ReportTemplate[]; saved: SavedReport[]; scheduled: string[] }>(KEY, "/reports")
  const [open, setOpen] = useState<ReportTemplate | null>(null)
  const schedule = useApiMutation((id: string) => http.post<{ scheduled: boolean }>(`/reports/schedule/${id}`), {
    invalidate: [KEY],
    success: (r) => (r.scheduled ? "Rapor her pazartesi 08:00 için zamanlandı." : "Rapor zamanlaması kaldırıldı."),
  })

  return (
    <>
      <ModuleWorkspace module="reports" customTabs={["Rapor kütüphanesi", "Kayıtlı raporlar", "Zamanlanmış raporlar"]}>
        {(tab) => {
          const templates = data?.templates ?? []
          const visible =
            tab === "Kayıtlı raporlar"
              ? templates.filter((t) => data?.saved.some((s) => s.templateId === t.id))
              : tab === "Zamanlanmış raporlar"
                ? templates.filter((t) => data?.scheduled.includes(t.id))
                : templates
          return (
            <>
              {tab === "Rapor kütüphanesi" && (
                <div className="mb-[23px] flex items-center gap-[23px] rounded-[9px] border border-sage-200 bg-sage-150 p-[30px] max-sm:p-[22px]">
                  <IconTile tone="sage" size="lg" icon={<ChartPieIcon size={28} />} />
                  <div className="flex-1">
                    <span className="text-3xs tracking-[1px] text-sage-subtle">VERİDEN KARARA</span>
                    <h2 className="my-2 text-xl font-medium tracking-title text-sage-700">Operasyonunuzu bir adım ileri taşıyın.</h2>
                    <p className="text-xs text-sage-muted">Hazır şablonlar gerçek kayıtlarınızdan hesaplanır; Excel uyumlu indirin, PDF olarak yazdırın.</p>
                  </div>
                  <span className="max-sm:hidden">
                    <Badge tone="green">{templates.length} rapor şablonu</Badge>
                  </span>
                </div>
              )}
              {visible.length ? (
                <Grid layout="cols-3">
                  {visible.map((t) => {
                    const Icon = ICONS[t.icon as keyof typeof ICONS] ?? FileTextIcon
                    const scheduled = data?.scheduled.includes(t.id)
                    return (
                      <Card key={t.id} padding="md">
                        <div className="mb-[22px] flex items-center justify-between">
                          <IconTile tone="sage" icon={<Icon size={20} />} />
                          <Pill>{t.phase}</Pill>
                        </div>
                        <h3 className="mb-2.5 text-md font-semibold text-ink-heading">{t.title}</h3>
                        <p className="min-h-[38px] text-xs leading-relaxed text-ink-subtle">{t.description}</p>
                        <footer className="mt-7 flex items-center justify-between">
                          <Button variant="primary" size="sm" onClick={() => setOpen(t)}>
                            Raporu oluştur
                          </Button>
                          {canDo("reports", "create") && (
                            <IconButton
                              aria-label={scheduled ? "Zamanlamayı kaldır" : "Haftalık zamanla"}
                              variant="outline"
                              icon={<CalendarClockIcon size={16} className={scheduled ? "text-brand" : undefined} />}
                              onClick={() => schedule.mutate(t.id)}
                            />
                          )}
                        </footer>
                      </Card>
                    )
                  })}
                </Grid>
              ) : (
                <Card>
                  <EmptyState
                    title={tab === "Kayıtlı raporlar" ? "Henüz kayıtlı raporunuz yok" : "Henüz zamanlanmış rapor yok"}
                    description="Rapor kütüphanesinden bir şablon seçerek başlayın."
                  />
                </Card>
              )}
              {tab === "Kayıtlı raporlar" && !!data?.saved.length && (
                <p className="mt-4 text-2xs text-ink-subtle">
                  {data.saved.map((s) => `${s.title} (${formatDate(s.from)} – ${formatDate(s.to)})`).join(" · ")}
                </p>
              )}
            </>
          )
        }}
      </ModuleWorkspace>
      {open && <ReportModal template={open} companyName={me?.tenant?.name ?? ""} onClose={() => setOpen(null)} />}
    </>
  )
}

function ReportModal({ template, companyName, onClose }: { template: ReportTemplate; companyName: string; onClose: () => void }) {
  const { canDo } = useAccess()
  const [from, setFrom] = useState("2026-10-28")
  const [to, setTo] = useState(today())
  const run = useApiMutation(() => http.post<ReportResult>(`/reports/run/${template.id}`, { from, to }), { toastError: false })
  const trend = useApiQuery<{ week: TrendPoint[] }>(["dashboard", "trend"], "/dashboard/trend")
  const save = useApiMutation(() => http.post(`/reports/saved`, { templateId: template.id, from, to }), {
    invalidate: [KEY],
    success: "Rapor, kayıtlı raporlarınıza eklendi.",
  })
  const report = run.data
  return (
    <Modal open onClose={onClose} size="lg" title={template.title} subtitle={`${formatDateLong(today())} · ${companyName}`}>
      <ModalBody>
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <FormField label="Başlangıç" flush>
            <DatePicker value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </FormField>
          <FormField label="Bitiş" flush>
            <DatePicker value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </FormField>
          <Button variant="primary" loading={run.isPending} onClick={() => run.mutate()}>
            Raporu çalıştır
          </Button>
        </div>
        {run.error && (
          <div className="mb-4">
            <Alert tone="error" title="Rapor oluşturulamadı">
              {errorMessage(run.error)}
            </Alert>
          </div>
        )}
        {report ? (
          <>
            <StatGroup
              items={[
                { label: "Sefer sayısı", value: String(report.tripCount) },
                { label: "Zamanında teslim", value: report.onTimeRate, tone: "positive" },
                { label: "Evrak tamlığı", value: report.documentCompleteness },
              ]}
            />
            <div className="mt-5">{trend.data && <AreaChart aria-label="Rapor dönemi gelir ve gider" data={trend.data.week} series={[{ key: "revenue", label: "Gelir" }, { key: "cost", label: "Gider" }]} />}</div>
          </>
        ) : (
          <p className="text-xs text-ink-subtle">Tarih aralığını seçip raporu çalıştırın.</p>
        )}
      </ModalBody>
      <ModalFooter>
        {canDo("reports", "create") && (
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Raporu kaydet
          </Button>
        )}
        <Button onClick={() => window.print()}>PDF / Yazdır</Button>
        {canDo("reports", "export") && (
          <Button
            variant="primary"
            leftIcon={<DownloadIcon size={14} />}
            disabled={!report}
            onClick={() => report && exportCSV([["Sefer", "Müşteri", "Gelir", "Gider"], ...report.rows.map((r) => [r.trip, r.customer, r.revenue, r.cost])], template.title)}
          >
            Excel uyumlu indir
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
